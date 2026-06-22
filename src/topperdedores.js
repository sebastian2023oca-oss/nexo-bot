import db from './db.js'

const MEDALLAS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

const topperdedores = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT jid, derrotas, total_perdido FROM casino_stats ORDER BY derrotas DESC LIMIT 10'
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `📊 Aún no hay derrotas registradas.` }, { quoted: mensaje })
            return
        }

        let texto = `💀 *TOP PERDEDORES*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        const menciones = []

        rows.forEach((u, i) => {
            texto += `${MEDALLAS[i]} @${u.jid.split('@')[0]} — ${u.derrotas || 0} derrotas (${(u.total_perdido || 0).toLocaleString()} 💸 perdidas)\n`
            menciones.push(u.jid)
        })

        texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto, mentions: menciones }, { quoted: mensaje })
    }
}

export default topperdedores
