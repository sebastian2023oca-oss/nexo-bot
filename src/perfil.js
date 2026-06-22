import db from './db.js'
import { obtenerOCachear, invalidarCache, TTL } from './cache.js'

const perfil = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid

        let targetJid = mensaje.key.participant || mensaje.key.remoteJid
        let targetNombre = mensaje.pushName || 'Usuario'

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
        if (mencionado) {
            targetJid = mencionado
            targetNombre = mencionado.split('@')[0]
        }

        // Caché por usuario objetivo: muchas personas pueden pedir el
        // mismo perfil ajeno en poco tiempo (ej. "mira el perfil de X").
        const { rows, totalRows, equipados } = await obtenerOCachear(
            `perfil:${targetJid}`,
            TTL.PERFIL,
            async () => {
                const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [targetJid])
                const [totalRows] = await db.execute('SELECT COUNT(*) as total FROM usuarios')
                const [equipados] = await db.execute(
                    'SELECT item FROM inventario_usuario WHERE jid = ? AND equipado = 1', [targetJid]
                )
                return { rows, totalRows, equipados }
            }
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Este usuario no está registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const u = rows[0]
        const nombre = u.nombre_perfil || u.nombre || targetNombre
        const bio = u.bio || 'Sin biografía'
        const status = u.status_perfil || 'activo'
        const xpTotal = u.xp || 0
        const nivelActual = u.nivel || 1
        const xpEnNivel = xpTotal % 100
        const xpNecesario = nivelActual * 100
        const porcentaje = Math.min(Math.floor(xpEnNivel / xpNecesario * 100), 100)
        const barra = '█'.repeat(Math.floor(porcentaje / 10)) + '░'.repeat(10 - Math.floor(porcentaje / 10))
        const userId = String(u.id).padStart(3, '0')
        const total = String(totalRows[0].total).padStart(3, '0')

        // VIP
        let vipTexto = '❌ Inactivo'
        if (u.vip && u.vip_expira) {
            const ahora = Date.now()
            const expira = new Date(u.vip_expira).getTime()
            const restante = expira - ahora
            if (restante > 0) {
                const horas = Math.floor(restante / 3600000)
                const mins = Math.floor((restante % 3600000) / 60000)
                const tipo = u.vip_tipo || 'normal'
                vipTexto = `✅ Activo | Tipo: ${tipo.toUpperCase()} | ⏳ ${horas}h ${mins}m restantes`
            } else {
                vipTexto = '❌ Expirado'
            }
        }

        // Negocio
        let negocioTexto = '❌ Inactivo'
        if (u.negocio && u.neg_expira) {
            const ahora = Date.now()
            const expira = new Date(u.neg_expira).getTime()
            const restante = expira - ahora
            if (restante > 0) {
                const horas = Math.floor(restante / 3600000)
                const mins = Math.floor((restante % 3600000) / 60000)
                const tipo = u.neg_tipo || 'normal'
                negocioTexto = `✅ Activo | Tipo: ${tipo.toUpperCase()} | ⏳ ${horas}h ${mins}m restantes`
            } else {
                negocioTexto = '❌ Expirado'
            }
        }

        const tienMarco = u.marco === 1
        const topBorder = tienMarco ? `╔══⭐ PERFIL ESPECIAL ⭐══╗` : `╔══════════════════════════╗`
        const botBorder = tienMarco ? `╚══⭐════════════════⭐══╝` : `╚══════════════════════════╝`

        const equipadosTexto = equipados.length > 0
            ? equipados.map(e => `⚡ ${e.item}`).join('\n')
            : 'Ninguno'

        await sock.sendMessage(jid, {
            text: `${topBorder}
║     👤 PERFIL DE USUARIO     ║
${botBorder}

👤 *Nombre:* ${nombre}
🆔 *ID:* #${userId}
📝 *Bio:* ${bio}
🔵 *Estado:* ${status}
📅 *Antigüedad:* Usuario *#${userId}* de *#${total}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *PROGRESO*

⭐ *Nivel:* ${nivelActual}
✨ *XP:* ${xpEnNivel} / ${xpNecesario}
📈 *Progreso:* [${barra}] ${porcentaje}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 *ECONOMÍA*

💵 *Monedas:* ${u.monedas || 0}
🏦 *Banco:* ${u.banco || 0}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚔️ *ÍTEMS EQUIPADOS*

${equipadosTexto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👑 *VIP:* ${vipTexto}
🏢 *Negocio:* ${negocioTexto}
⭐ *Reputación:* ${u.reputacion || 0}

${botBorder}`
        }, { quoted: mensaje })
    }
}

// Permite que comandos que modifican el perfil (setbio, setname, setstatus,
// resetperfil, addvip, addnegocio, etc.) invaliden la caché de un usuario
// puntual sin que este archivo necesite conocerlos a ellos.
export function invalidarCachePerfil(targetJid) {
    invalidarCache(`perfil:${targetJid}`)
}

export default perfil
