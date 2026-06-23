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

async function tablaExiste(nombre) {
    try {
        const [rows] = await db.execute('SHOW TABLES LIKE ?', [nombre])
        return rows.length > 0
    } catch {
        return false
    }
}

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
                text: `⚠️🚨 *RESTABLECIMIENTO TOTAL DEL SISTEMA* 🚨⚠️\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nEsta acción es *IRREVERSIBLE* y va a:\n\n💀 Borrar TODAS las monedas, banco, XP, nivel, reputación e inventario de *TODOS* los usuarios.\n💀 Eliminar bodegas, ítems activos, cooldowns, préstamos, inversiones, insignias y estadísticas de casino.\n💀 Esto te afecta también a *TI*, incluyendo al dueño del bot.\n💀 No hay backup automático antes de esto.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📌 Si estás completamente seguro, escribe en los próximos *30 segundos*:\n\n*.restablecimiento ${CONFIRMACION_TEXTO}*\n\n💡 Tip: usa *.backup* antes de continuar si quieres poder recuperar los datos.`
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

            // Vaciar tablas dependientes si existen
            for (const tabla of TABLAS_A_LIMPIAR) {
                if (await tablaExiste(tabla)) {
                    try {
                        await db.execute(`TRUNCATE TABLE \`${tabla}\``)
                        tablasLimpiadas++
                    } catch {
                        // Si TRUNCATE falla por FK, intentar DELETE
                        try {
                            await db.execute(`DELETE FROM \`${tabla}\``)
                            tablasLimpiadas++
                        } catch {
                            tablasOmitidas++
                        }
                    }
                } else {
                    tablasOmitidas++
                }
            }

            // Reiniciar pozos globales de casino si existen
            if (await tablaExiste('casino_jackpot')) {
                await db.execute('UPDATE casino_jackpot SET pozo = 0 WHERE id = 1').catch(() => {})
            }
            if (await tablaExiste('casino_pozo_mundial')) {
                await db.execute('UPDATE casino_pozo_mundial SET pozo = 0 WHERE id = 1').catch(() => {})
            }

            await sock.sendMessage(jid, {
                text: `✅ *RESTABLECIMIENTO COMPLETADO*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Todos los usuarios quedaron en *0 monedas, 0 banco, nivel 1, 0 XP, 0 reputación*.\n🗑️ *${tablasLimpiadas}* tablas relacionadas fueron vaciadas.\n${tablasOmitidas > 0 ? `⚠️ *${tablasOmitidas}* tablas no existían y fueron omitidas.\n` : ''}\n👑 *Ejecutado por:* @${userJid.split('@')[0]}\n📅 *Fecha:* ${new Date().toLocaleString('es-CO')}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🚀 Nexo-Bot ha vuelto a su estado inicial.`,
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
