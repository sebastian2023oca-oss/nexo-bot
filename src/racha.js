import db from './db.js'

const racha = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute('SELECT * FROM casino_stats WHERE jid = ?', [userJid])

        if (rows.length === 0) {
            await sock.sendMessage(jid, {
                text: `🔥 *TU RACHA*\n\nAún no tienes partidas registradas en el casino.\n\n💡 Juega algún comando del *.menu 5* para empezar tu racha.`
            }, { quoted: mensaje })
            return
        }

        const u = rows[0]
        let estado = '😐 Neutral'
        if (u.racha_actual >= 10) estado = '🔥🔥🔥 ¡EN LLAMAS!'
        else if (u.racha_actual >= 5) estado = '🔥 Caliente'
        else if (u.racha_actual >= 2) estado = '✨ Calentando'
        else if (u.racha_actual === 0) estado = '❄️ Fría'

        await sock.sendMessage(jid, {
            text: `🔥 *TU RACHA ACTUAL*\n\n📊 *Racha actual:* ${u.racha_actual} victorias seguidas\n🏆 *Mejor racha histórica:* ${u.mejor_racha}\n🔵 *Estado:* ${estado}\n\n✅ *Victorias totales:* ${u.victorias}\n❌ *Derrotas totales:* ${u.derrotas}`
        }, { quoted: mensaje })
    }
}

export default racha
