import db from './db.js'

const xp = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const u = rows[0]
        const xpActual = u.xp || 0
        const nivelActual = u.nivel || 1
        const xpSiguiente = nivelActual * 100
        const falta = xpSiguiente - (xpActual % 100)

        await sock.sendMessage(jid, {
            text: `✨ *XP DE ${(u.nombre || 'Usuario').toUpperCase()}*\n\n📊 *XP total:* ${xpActual}\n⭐ *Nivel:* ${nivelActual}\n🎯 *XP para siguiente nivel:* ${falta} XP restantes`
        }, { quoted: mensaje })
    }
}

export default xp
