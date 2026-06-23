import db from './db.js'
import { esOwner } from './owners.js'

const PORCENTAJE_IMPUESTO = 0.9 // 90%

const impuestos = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        // Confirmación simple para evitar ejecuciones accidentales
        if (args[0]?.toUpperCase() !== 'CONFIRMAR') {
            await sock.sendMessage(jid, {
                text: `⚠️ *IMPUESTO GENERAL DEL ${Math.round(PORCENTAJE_IMPUESTO * 100)}%*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nEsto le quitará el *${Math.round(PORCENTAJE_IMPUESTO * 100)}%* del dinero (mano + banco) a *TODOS* los usuarios registrados, incluyéndote a ti.\n\n📌 Para confirmar, escribe:\n*.impuestos CONFIRMAR*`
            }, { quoted: mensaje })
            return
        }

        const [usuarios] = await db.execute(
            'SELECT jid, monedas, banco FROM usuarios WHERE (monedas > 0 OR banco > 0)'
        )

        if (usuarios.length === 0) {
            await sock.sendMessage(jid, {
                text: `⚠️ No hay usuarios con dinero para aplicar el impuesto.`
            }, { quoted: mensaje })
            return
        }

        await sock.sendMessage(jid, {
            text: `🏛️ *Aplicando impuesto general del ${Math.round(PORCENTAJE_IMPUESTO * 100)}% a ${usuarios.length} usuarios...*\n\n⏳ Por favor espera.`
        }, { quoted: mensaje })

        let totalRecaudadoMano = 0
        let totalRecaudadoBanco = 0
        const afectados = []

        try {
            const connection = await db.getConnection()
            try {
                await connection.beginTransaction()

                for (const u of usuarios) {
                    const monedasActuales = u.monedas || 0
                    const bancoActual = u.banco || 0

                    const quitarMano = Math.floor(monedasActuales * PORCENTAJE_IMPUESTO)
                    const quitarBanco = Math.floor(bancoActual * PORCENTAJE_IMPUESTO)
                    const totalQuitado = quitarMano + quitarBanco

                    if (totalQuitado <= 0) continue

                    await connection.execute(
                        'UPDATE usuarios SET monedas = monedas - ?, banco = banco - ? WHERE jid = ?',
                        [quitarMano, quitarBanco, u.jid]
                    )

                    totalRecaudadoMano += quitarMano
                    totalRecaudadoBanco += quitarBanco

                    afectados.push({
                        jid: u.jid,
                        totalQuitado,
                        quitarMano,
                        quitarBanco
                    })
                }

                await connection.commit()
            } catch (err) {
                await connection.rollback()
                throw err
            } finally {
                connection.release()
            }

            const totalRecaudado = totalRecaudadoMano + totalRecaudadoBanco

            // Top 5 más afectados (mayor cantidad total quitada)
            const top5 = [...afectados]
                .sort((a, b) => b.totalQuitado - a.totalQuitado)
                .slice(0, 5)

            const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
            let textoTop = ''
            const menciones = []

            top5.forEach((a, i) => {
                textoTop += `${medallas[i]} @${a.jid.split('@')[0]} — perdió *${a.totalQuitado.toLocaleString()} monedas*\n`
                textoTop += `   💵 Mano: -${a.quitarMano.toLocaleString()} | 🏦 Banco: -${a.quitarBanco.toLocaleString()}\n\n`
                menciones.push(a.jid)
            })

            await sock.sendMessage(jid, {
                text: `🏛️ *IMPUESTO GENERAL APLICADO*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 *Usuarios afectados:* ${afectados.length}\n💰 *Total recaudado:* ${totalRecaudado.toLocaleString()} monedas\n   💵 De manos: ${totalRecaudadoMano.toLocaleString()}\n   🏦 De bancos: ${totalRecaudadoBanco.toLocaleString()}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🏆 *TOP 5 MÁS AFECTADOS*\n\n${textoTop}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n👑 *Ejecutado por:* @${userJid.split('@')[0]}\n📅 *Fecha:* ${new Date().toLocaleString('es-CO')}`,
                mentions: [...menciones, userJid]
            }, { quoted: mensaje })

            console.log(`🏛️ IMPUESTO GENERAL ejecutado por ${userJid} — ${afectados.length} usuarios afectados, recaudado: ${totalRecaudado}`)

        } catch (error) {
            console.error('Error aplicando impuestos:', error)
            await sock.sendMessage(jid, {
                text: `❌ *Error al aplicar el impuesto.*\n\n\`${error.message}\`\n\nNo se aplicaron cambios (se revirtió la transacción).`
            }, { quoted: mensaje })
        }
    }
}

export default impuestos
