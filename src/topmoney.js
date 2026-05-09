import db from './db.js'

const topmoney = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT jid, nombre, monedas, banco FROM usuarios ORDER BY (monedas + banco) DESC LIMIT 10'
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `📊 Aún no hay usuarios registrados.` }, { quoted: mensaje })
            return
        }

        const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
        let texto = `💰 *TOP 10 RIQUEZA TOTAL*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        const menciones = []

        rows.forEach((u, i) => {
            const total = (u.monedas || 0) + (u.banco || 0)
            texto += `${medallas[i]} @${u.jid.split('@')[0]} — ${total.toLocaleString()} monedas\n`
            menciones.push(u.jid)
        })

        texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto, mentions: menciones }, { quoted: mensaje })
    }
}

export default topmoney