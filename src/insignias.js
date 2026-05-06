import db from './db.js'

const insignias = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute('SELECT * FROM insignias WHERE jid = ?', [userJid])

        if (rows.length === 0) {
            await sock.sendMessage(jid, {
                text: `🏅 *INSIGNIAS*\n\nAún no tienes insignias.\n\n💡 Sigue usando el bot para ganar logros.`
            }, { quoted: mensaje })
            return
        }

        let texto = `🏅 *TUS INSIGNIAS* (${rows.length})\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        for (const insignia of rows) {
            texto += `✦ ${insignia.nombre}\n`
        }
        texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default insignias
