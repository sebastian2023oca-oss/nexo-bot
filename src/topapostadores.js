import db from './db.js'

const MEDALLAS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

const topapostadores = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT jid, total_apostado FROM casino_stats ORDER BY total_apostado DESC LIMIT 10'
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `📊 Aún no hay apuestas registradas.` }, { quoted: mensaje })
            return
        }

        let texto = `🎲 *TOP APOSTADORES*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        const menciones = []

        rows.forEach((u, i) => {
            texto += `${MEDALLAS[i]} @${u.jid.split('@')[0]} — ${(u.total_apostado || 0).toLocaleString()} monedas apostadas\n`
            menciones.push(u.jid)
        })

        texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto, mentions: menciones }, { quoted: mensaje })
    }
}

export default topapostadores
