import db from './db.js'

const saldo = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const u = rows[0]
        const total = (u.monedas || 0) + (u.banco || 0)

        await sock.sendMessage(jid, {
            text: `💰 *RESUMEN DE SALDO*\n\n💵 *En mano:* ${u.monedas || 0} monedas\n🏦 *En banco:* ${u.banco || 0} monedas\n\n📊 *Total:* ${total} monedas`
        }, { quoted: mensaje })
    }
}

export default saldo
