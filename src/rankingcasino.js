import db from './db.js'
import { obtenerOCachear, TTL } from './cache.js'

const MEDALLAS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

const rankingcasino = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        const rows = await obtenerOCachear('ranking:casino', TTL.RANKING_CASINO, async () => {
            const [rows] = await db.execute(
                'SELECT jid, total_ganado, victorias FROM casino_stats ORDER BY total_ganado DESC LIMIT 10'
            )
            return rows
        })

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `📊 Aún no hay estadísticas de casino registradas.` }, { quoted: mensaje })
            return
        }

        let texto = `🎰 *RANKING GENERAL DEL CASINO*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        const menciones = []

        rows.forEach((u, i) => {
            texto += `${MEDALLAS[i]} @${u.jid.split('@')[0]} — ${(u.total_ganado || 0).toLocaleString()} 💰 ganadas (${u.victorias || 0} victorias)\n`
            menciones.push(u.jid)
        })

        texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto, mentions: menciones }, { quoted: mensaje })
    }
}

export default rankingcasino
