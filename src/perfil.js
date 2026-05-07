import db from './db.js'

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

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [targetJid])
        const [totalRows] = await db.execute('SELECT COUNT(*) as total FROM usuarios')

        if (rows.length === 0) {
            await sock.sendMessage(jid, {
                text: `❌ Este usuario no está registrado en el bot.`
            }, { quoted: mensaje })
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

        // Marco especial o normal
        const tienMarco = u.marco === 1
        const topBorder = tienMarco ? `╔══⭐ PERFIL ESPECIAL ⭐══╗` : `╔══════════════════════════╗`
        const botBorder = tienMarco ? `╚══⭐════════════════⭐══╝` : `╚══════════════════════════╝`

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

👑 *VIP:* ${u.vip ? '✅ Activo' : '❌ Inactivo'}
🏢 *Negocio:* ${u.negocio ? '✅ Activo' : '❌ Inactivo'}
⭐ *Reputación:* ${u.reputacion || 0}

${botBorder}`
        }, { quoted: mensaje })
    }
}

export default perfil