import db from './db.js'

const reputacion = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const rep = rows[0].reputacion || 0
        let estado = rep >= 100 ? '⭐ Excelente' : rep >= 50 ? '👍 Buena' : rep >= 0 ? '😐 Neutral' : '👎 Baja'

        await sock.sendMessage(jid, {
            text: `⭐ *TU REPUTACIÓN*\n\n📊 *Puntos:* ${rep}\n🔵 *Estado:* ${estado}\n\n💡 Interactúa más para mejorar tu reputación.`
        }, { quoted: mensaje })
    }
}

export default reputacion
