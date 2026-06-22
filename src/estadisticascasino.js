import db from './db.js'

const estadisticascasino = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute('SELECT * FROM casino_stats WHERE jid = ?', [userJid])

        if (rows.length === 0) {
            await sock.sendMessage(jid, {
                text: `📊 *ESTADÍSTICAS DE CASINO*\n\nAún no tienes partidas registradas.\n\n💡 Juega algún comando del *.menu 5* para empezar.`
            }, { quoted: mensaje })
            return
        }

        const u = rows[0]
        const totalPartidas = (u.victorias || 0) + (u.derrotas || 0)
        const winrate = totalPartidas > 0 ? ((u.victorias / totalPartidas) * 100).toFixed(1) : '0.0'
        const neto = (u.total_ganado || 0) - (u.total_perdido || 0)

        await sock.sendMessage(jid, {
            text: `📊 *ESTADÍSTICAS DE CASINO*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎲 *Total apostado:* ${(u.total_apostado || 0).toLocaleString()} monedas\n💰 *Total ganado:* ${(u.total_ganado || 0).toLocaleString()} monedas\n💸 *Total perdido:* ${(u.total_perdido || 0).toLocaleString()} monedas\n${neto >= 0 ? '📈' : '📉'} *Balance neto:* ${neto >= 0 ? '+' : ''}${neto.toLocaleString()} monedas\n\n✅ *Victorias:* ${u.victorias || 0}\n❌ *Derrotas:* ${u.derrotas || 0}\n🎯 *Winrate:* ${winrate}%\n\n🔥 *Racha actual:* ${u.racha_actual || 0}\n🏆 *Mejor racha:* ${u.mejor_racha || 0}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        }, { quoted: mensaje })
    }
}

export default estadisticascasino
