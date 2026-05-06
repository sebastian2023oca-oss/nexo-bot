import db from './db.js'

const balance = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const u = rows[0]

        await sock.sendMessage(jid, {
            text: `💵 *TU BALANCE*\n\n💰 *Dinero en mano:* ${u.monedas || 0} monedas\n\n💡 Usa *.banco* para ver tu dinero guardado.`
        }, { quoted: mensaje })
    }
}

export default balance
