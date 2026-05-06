import db from './db.js'

const banco = {
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
            text: `🏦 *TU BANCO*\n\n💰 *Dinero en banco:* ${u.banco || 0} monedas\n\n💡 El dinero en el banco está protegido de robos.`
        }, { quoted: mensaje })
    }
}

export default banco
