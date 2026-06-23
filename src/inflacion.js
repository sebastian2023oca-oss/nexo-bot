import db from './db.js'
import { esOwner } from './owners.js'

// Parámetros del modelo de inflación "justa":
// El % de subida se calcula según cuánto dinero promedio circula por usuario
// comparado con un valor de referencia. Mientras más rica esté la economía
// del servidor, mayor sube la tienda (para frenar la inflación de monedas);
// si la economía está controlada, sube poco.
const REFERENCIA_PROMEDIO = 5000   // monedas promedio "saludable" por usuario
const INFLACION_MINIMA = 0.03      // 3% mínimo, siempre sube algo
const INFLACION_MAXIMA = 0.35      // 35% tope máximo por ejecución

const inflacion = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        // Calcular el % de inflación según el estado real de la economía
        const [statsUsuarios] = await db.execute(
            'SELECT COUNT(*) as total, COALESCE(SUM(monedas + banco), 0) as circulante FROM usuarios'
        )

        const totalUsuarios = statsUsuarios[0]?.total || 0
        const circulante = Number(statsUsuarios[0]?.circulante || 0)
        const promedioPorUsuario = totalUsuarios > 0 ? circulante / totalUsuarios : 0

        // Ratio respecto a la referencia saludable
        const ratio = promedioPorUsuario / REFERENCIA_PROMEDIO

        // Inflación proporcional al ratio, acotada entre mínimo y máximo
        let porcentajeCalculado = INFLACION_MINIMA * Math.max(1, ratio)
        porcentajeCalculado = Math.min(INFLACION_MAXIMA, Math.max(INFLACION_MINIMA, porcentajeCalculado))

        // Permitir override manual: .inflacion 15  -> fuerza 15%
        let porcentaje = porcentajeCalculado
        let esManual = false
        if (args[0] && !isNaN(parseFloat(args[0]))) {
            const manual = parseFloat(args[0]) / 100
            if (manual > 0 && manual <= 1) {
                porcentaje = manual
                esManual = true
            }
        }

        const [items] = await db.execute('SELECT * FROM tienda')

        if (items.length === 0) {
            await sock.sendMessage(jid, { text: `⚠️ La tienda está vacía, no hay precios que ajustar.` }, { quoted: mensaje })
            return
        }

        const porcentajeTexto = (porcentaje * 100).toFixed(1)

        if (args[0]?.toUpperCase() !== 'CONFIRMAR' && !esManual) {
            await sock.sendMessage(jid, {
                text: `📈 *INFLACIÓN DE LA TIENDA*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 *Análisis del sistema:*\n👥 Usuarios: ${totalUsuarios}\n💰 Circulante total: ${circulante.toLocaleString()} monedas\n📐 Promedio por usuario: ${Math.round(promedioPorUsuario).toLocaleString()} monedas\n📏 Referencia saludable: ${REFERENCIA_PROMEDIO.toLocaleString()} monedas\n\n📈 *Subida calculada:* +${porcentajeTexto}%\n🏪 *Ítems afectados:* ${items.length}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚠️ Esto sube los precios de *TODA* la tienda de forma *PERMANENTE*.\n\n📌 Para confirmar con el % calculado, escribe:\n*.inflacion CONFIRMAR*\n\n📌 O para forzar un % manual (ej. 20%):\n*.inflacion 20*`
            }, { quoted: mensaje })
            return
        }

        await sock.sendMessage(jid, {
            text: `📈 *Aplicando inflación del ${porcentajeTexto}% a ${items.length} ítems...*\n\n⏳ Por favor espera.`
        }, { quoted: mensaje })

        try {
            const cambios = []

            for (const item of items) {
                const precioAnterior = item.precio
                const precioNuevo = Math.max(precioAnterior + 1, Math.round(precioAnterior * (1 + porcentaje)))

                await db.execute(
                    'UPDATE tienda SET precio = ?, ultimo_precio_cambio = NOW() WHERE id = ?',
                    [precioNuevo, item.id]
                )

                cambios.push({
                    nombre: item.nombre || item.item,
                    anterior: precioAnterior,
                    nuevo: precioNuevo
                })
            }

            // Top 5 ítems con mayor subida absoluta, para informar
            const top5 = [...cambios]
                .sort((a, b) => (b.nuevo - b.anterior) - (a.nuevo - a.anterior))
                .slice(0, 5)

            let textoTop = ''
            for (const c of top5) {
                textoTop += `✦ *${c.nombre}*: ${c.anterior.toLocaleString()} → ${c.nuevo.toLocaleString()} 💰 (+${(c.nuevo - c.anterior).toLocaleString()})\n`
            }

            await sock.sendMessage(jid, {
                text: `📈 *INFLACIÓN APLICADA*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ *Subida aplicada:* +${porcentajeTexto}%${esManual ? ' (manual)' : ' (calculada por el sistema)'}\n🏪 *Ítems actualizados:* ${cambios.length}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔝 *MAYORES SUBIDAS*\n\n${textoTop}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n👑 *Ejecutado por:* @${userJid.split('@')[0]}\n📅 *Fecha:* ${new Date().toLocaleString('es-CO')}\n\n⚠️ Esta subida es permanente y se suma a las variaciones automáticas normales de la tienda.`,
                mentions: [userJid]
            }, { quoted: mensaje })

            console.log(`📈 INFLACIÓN ejecutada por ${userJid} — +${porcentajeTexto}% sobre ${cambios.length} ítems`)

        } catch (error) {
            console.error('Error aplicando inflación:', error)
            await sock.sendMessage(jid, {
                text: `❌ *Error al aplicar la inflación.*\n\n\`${error.message}\``
            }, { quoted: mensaje })
        }
    }
}

export default inflacion
