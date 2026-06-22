import db from './db.js'

const MEDALLAS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

const topganadores = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT jid, victorias, total_ganado FROM casino_stats ORDER BY victorias DESC LIMIT 10'
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `📊 Aún no hay victorias registradas.` }, { quoted: mensaje })
            return
        }

        let texto = `🏆 *TOP GANADORES*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        const menciones = []

        rows.forEach((u, i) => {
            texto += `${MEDALLAS[i]} @${u.jid.split('@')[0]} — ${u.victorias || 0} victorias (${(u.total_ganado || 0).toLocaleString()} 💰)\n`
            menciones.push(u.jid)
        })

        texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto, mentions: menciones }, { quoted: mensaje })
    }
}

export default topganadores
