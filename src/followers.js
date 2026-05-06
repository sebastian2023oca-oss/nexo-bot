import db from './db.js'

const followers = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT COUNT(*) as total FROM seguidores WHERE jid_seguido = ?',
            [userJid]
        )

        const total = rows[0]?.total || 0

        await sock.sendMessage(jid, {
            text: `👥 *TUS SEGUIDORES*\n\n📊 Tienes *${total}* seguidores en el bot.`
        }, { quoted: mensaje })
    }
}

export default followers
