import db from './db.js'

const rank = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT jid, COUNT(*) as pos FROM usuarios WHERE xp > (SELECT xp FROM usuarios WHERE jid = ?) ',
            [userJid]
        )

        const [user] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])

        if (user.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const posicion = (rows[0]?.pos || 0) + 1

        await sock.sendMessage(jid, {
            text: `🏆 *TU RANKING*\n\n📊 Estás en la posición *#${posicion}* del ranking global.\n\n⭐ *Nivel:* ${user[0].nivel || 1}\n✨ *XP:* ${user[0].xp || 0}\n\n💡 Usa más el bot para subir en el ranking.`
        }, { quoted: mensaje })
    }
}

export default rank
