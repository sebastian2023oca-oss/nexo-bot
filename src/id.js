import db from './db.js'

const id = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid
        const numero = userJid.split('@')[0]

        // Obtener el id del usuario y el total de usuarios
        const [userRows] = await db.execute('SELECT id FROM usuarios WHERE jid = ?', [userJid])
        const [totalRows] = await db.execute('SELECT COUNT(*) as total FROM usuarios')

        if (userRows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const userId = String(userRows[0].id).padStart(3, '0')
        const total = String(totalRows[0].total).padStart(3, '0')

        await sock.sendMessage(jid, {
            text: `🆔 *TU IDENTIFICADOR*\n\n📱 *Número:* ${numero}\n🔑 *JID:* ${userJid}\n\n📅 *Antigüedad:* Usuario *#${userId}* de *#${total}*`
        }, { quoted: mensaje })
    }
}

export default id