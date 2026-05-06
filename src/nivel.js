import db from './db.js'

const nivel = {
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
        const xpNecesario = nivelActual * 100
        const xpEnNivel = xpActual % 100
        const porcentaje = Math.min(Math.floor(xpEnNivel / xpNecesario * 100), 100)
        const barra = '█'.repeat(Math.floor(porcentaje / 10)) + '░'.repeat(10 - Math.floor(porcentaje / 10))

        await sock.sendMessage(jid, {
            text: `⭐ *NIVEL DE ${(u.nombre || 'Usuario').toUpperCase()}*\n\n🎯 *Nivel actual:* ${nivelActual}\n✨ *XP:* ${xpEnNivel} / ${xpNecesario}\n📈 *Progreso:* [${barra}] ${porcentaje}%\n\n💡 Sigue usando el bot para subir de nivel.`
        }, { quoted: mensaje })
    }
}

export default nivel
