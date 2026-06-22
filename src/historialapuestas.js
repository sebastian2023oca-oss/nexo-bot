import db from './db.js'

const historialapuestas = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT * FROM casino_historial WHERE jid = ? ORDER BY fecha DESC LIMIT 10',
            [userJid]
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `📜 *HISTORIAL DE APUESTAS*\n\nNo tienes apuestas registradas.` }, { quoted: mensaje })
            return
        }

        const emojis = { gano: '✅', perdio: '❌', empate: '🤝' }

        let texto = `📜 *TUS ÚLTIMAS APUESTAS*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

        for (const h of rows) {
            const emoji = emojis[h.resultado] || '📦'
            const fecha = new Date(h.fecha).toLocaleDateString('es-CO')
            texto += `${emoji} *${h.juego.toUpperCase()}* — ${h.cantidad.toLocaleString()} monedas\n📅 ${fecha}\n\n`
        }

        texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default historialapuestas
