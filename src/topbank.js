import db from './db.js'

const topbank = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT nombre, banco FROM usuarios ORDER BY banco DESC LIMIT 10'
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `📊 Aún no hay usuarios registrados.` }, { quoted: mensaje })
            return
        }

        const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
        let texto = `🏦 *TOP 10 BANCO*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

        rows.forEach((u, i) => {
            texto += `${medallas[i]} *${u.nombre || 'Usuario'}* — ${(u.banco || 0).toLocaleString()} monedas\n`
        })

        texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default topbank
