import db from './db.js'

const topbank = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT jid, nombre, banco FROM usuarios ORDER BY banco DESC LIMIT 10'
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `📊 Aún no hay usuarios registrados.` }, { quoted: mensaje })
            return
        }

        const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
        let texto = `🏦 *TOP 10 BANCO*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        const menciones = []

        rows.forEach((u, i) => {
            texto += `${medallas[i]} @${u.jid.split('@')[0]} — ${(u.banco || 0).toLocaleString()} monedas\n`
            menciones.push(u.jid)
        })

        texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto, mentions: menciones }, { quoted: mensaje })
    }
}

export default topbank