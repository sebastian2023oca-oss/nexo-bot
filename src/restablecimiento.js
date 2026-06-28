import db from './db.js'
import { esOwner, OWNER_PRINCIPAL } from './owners.js'

// Comando destructivo: borra TODO el progreso de TODOS los usuarios (incluido el owner).
// Requiere doble confirmación porque la acción es irreversible.

const CONFIRMACION_TEXTO = 'CONFIRMAR'
const VENTANA_CONFIRMACION_MS = 30000

const confirmacionesPendientes = new Map() // jid -> timestamp

// Lista de tablas que se vacían si existen (no todas existen siempre, según el estado del bot)
const TABLAS_A_LIMPIAR = [
    'inventario_usuario',
    'inventario',
    'bodega',
    'items_activos',
    'cooldowns',
    'historico_items',
    'economia',
    'inversiones',
    'prestamos',
    'prestamos_usuarios',
    'seguidores',
    'bloqueados',
    'insignias',
    'juegos_stats',
    'casino_stats',
    'casino_historial',
    'casino_retos',
    'casino_rey',
    'usuarios_baneados',
    'usuarios_muteados',
    'codigos_usados',
    'codigos_canjeables',
    'top_historial',
    'top_recompensas',
    'top_rachas',
    'solicitudes',
    'warns',
]

// Nota: la verificación de existencia de tablas ahora se hace de forma
// directa al intentar el TRUNCATE/DELETE (ver más abajo), distinguiendo
// el error específico de "tabla no existe" (errno 1146) de errores reales.
// Antes se usaba SHOW TABLES LIKE con prepared statement, lo cual fallaba
// silenciosamente en algunos entornos de mysql2 y reportaba "no existe"
// para tablas que sí existían.

const restablecimiento = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        const confirmacion = args[0]

        // Paso 1: primera invocación sin confirmar
        if (confirmacion?.toUpperCase() !== CONFIRMACION_TEXTO) {
            confirmacionesPendientes.set(userJid, Date.now())
            await sock.sendMessage(jid, {
                text: `⚠️🚨 *RESTABLECIMIENTO TOTAL DEL SISTEMA* 🚨⚠️\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nEsta acción es *IRREVERSIBLE* y va a:\n\n💀 Borrar TODAS las monedas, banco, XP, nivel, reputación de *TODOS* los usuarios.\n💀 Vaciar por completo el *inventario* y la *bodega* de cada usuario (todos los ítems, equipados o no, se pierden).\n💀 Eliminar ítems activos (pociones, escudos, boosts), cooldowns, préstamos, inversiones, insignias y estadísticas de casino.\n💀 Esto te afecta también a *TI*, incluyendo al dueño del bot.\n💀 No hay backup automático antes de esto.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📌 Si estás completamente seguro, escribe en los próximos *30 segundos*:\n\n*.restablecimiento ${CONFIRMACION_TEXTO}*\n\n💡 Tip: usa *.backup* antes de continuar si quieres poder recuperar los datos.`
            }, { quoted: mensaje })
            return
        }

        // Paso 2: confirmación recibida — validar que la advertencia se mostró recientemente
        const marcaTiempo = confirmacionesPendientes.get(userJid)
        if (!marcaTiempo || Date.now() - marcaTiempo > VENTANA_CONFIRMACION_MS) {
            confirmacionesPendientes.delete(userJid)
            await sock.sendMessage(jid, {
                text: `⌛ *Confirmación expirada o no solicitada.*\n\nEjecuta primero *.restablecimiento* (sin argumentos) para ver la advertencia y luego confirma dentro de los 30 segundos siguientes.`
            }, { quoted: mensaje })
            return
        }
        confirmacionesPendientes.delete(userJid)

        await sock.sendMessage(jid, {
            text: `🔄 *Restablecimiento en curso...*\n\n⏳ Por favor espera, esto puede tardar unos segundos.`
        }, { quoted: mensaje })

        let tablasLimpiadas = 0
        let tablasOmitidas = 0

        try {
            // Resetear todos los campos económicos/progreso en usuarios, manteniendo el registro
            await db.execute(`
                UPDATE usuarios SET
                    nivel = 1,
                    xp = 0,
                    monedas = 0,
                    banco = 0,
                    vip = 0,
                    vip_tipo = NULL,
                    vip_expira = NULL,
                    negocio = 0,
                    neg_tipo = NULL,
                    neg_expira = NULL,
                    reputacion = 0,
                    bio = NULL,
                    nombre_perfil = NULL,
                    status_perfil = 'activo',
                    marco = 0,
                    bodega_max = 100
            `).catch(async () => {
                // Fallback por si alguna columna no existe en el esquema actual
                await db.execute(`UPDATE usuarios SET nivel = 1, xp = 0, monedas = 0, banco = 0, vip = 0, negocio = 0, reputacion = 0`)
            })

            // Vaciar tablas dependientes. Se intenta directamente sin
            // depender solo de tablaExiste(), distinguiendo el error
            // específico "la tabla no existe" (ER_NO_SUCH_TABLE / errno 1146)
            // de cualquier otro error real (FK, permisos, etc.).
            const tablasConError = []
            const tablasNoExistentes = []

            for (const tabla of TABLAS_A_LIMPIAR) {
                try {
                    await db.execute(`TRUNCATE TABLE \`${tabla}\``)
                    tablasLimpiadas++
                } catch (errTruncate) {
                    if (errTruncate.errno === 1146 || errTruncate.code === 'ER_NO_SUCH_TABLE') {
                        tablasOmitidas++
                        tablasNoExistentes.push(tabla)
                        continue
                    }
                    // Si TRUNCATE falla por FK u otro motivo, intentar DELETE
                    try {
                        await db.execute(`DELETE FROM \`${tabla}\``)
                        tablasLimpiadas++
                    } catch (errDelete) {
                        tablasOmitidas++
                        tablasConError.push({ tabla, motivo: errDelete.message })
                        console.error(`❌ No se pudo limpiar la tabla "${tabla}":`, errDelete.message)
                    }
                }
            }

            // Reiniciar pozos globales de casino (mismo patrón: intento
            // directo, se ignora solo si la tabla específicamente no existe)
            for (const tablaPozo of ['casino_jackpot', 'casino_pozo_mundial']) {
                try {
                    await db.execute(`UPDATE \`${tablaPozo}\` SET pozo = 0 WHERE id = 1`)
                } catch (err) {
                    if (err.errno !== 1146 && err.code !== 'ER_NO_SUCH_TABLE') {
                        console.error(`⚠️ No se pudo reiniciar el pozo de "${tablaPozo}":`, err.message)
                    }
                }
            }

            const detalleErrores = tablasConError.length > 0
                ? `\n🚫 *Tablas que fallaron con error real:*\n${tablasConError.map(e => `   • \`${e.tabla}\`: ${e.motivo}`).join('\n')}\n`
                : ''

            await sock.sendMessage(jid, {
                text: `✅ *RESTABLECIMIENTO COMPLETADO*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Todos los usuarios quedaron en *0 monedas, 0 banco, nivel 1, 0 XP, 0 reputación*.\n🎒 *Inventario y bodega* de todos los usuarios vaciados por completo.\n🗑️ *${tablasLimpiadas}* tablas relacionadas fueron vaciadas correctamente.\n${tablasNoExistentes.length > 0 ? `ℹ️ *${tablasNoExistentes.length}* tablas no existían en la BD (normal si nunca se usaron): ${tablasNoExistentes.map(t => `\`${t}\``).join(', ')}\n` : ''}${detalleErrores}\n👑 *Ejecutado por:* @${userJid.split('@')[0]}\n📅 *Fecha:* ${new Date().toLocaleString('es-CO')}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🚀 Nexo-Bot ha vuelto a su estado inicial.`,
                mentions: [userJid]
            }, { quoted: mensaje })

            console.log(`🚨 RESTABLECIMIENTO TOTAL ejecutado por ${userJid}`)

        } catch (error) {
            console.error('Error en restablecimiento:', error)
            await sock.sendMessage(jid, {
                text: `❌ *Error durante el restablecimiento.*\n\n\`${error.message}\`\n\nAlgunas tablas pudieron haberse limpiado parcialmente. Revisa los logs.`
            }, { quoted: mensaje })
        }
    }
}

export default restablecimiento