import db from './db.js'

const historico = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT * FROM historico_items WHERE jid = ? ORDER BY fecha DESC LIMIT 10',
            [userJid]
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `📜 *HISTORIAL*\n\nNo tienes movimientos registrados.` }, { quoted: mensaje })
            return
        }

        const emojis = { comprar: '🛒', vender: '💸', regalar: '🎁', usar: '⚡', mejorar: '⬆️', almacenar: '🏠', sacar: '📤' }

        let texto = `📜 *TUS ÚLTIMOS MOVIMIENTOS*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

        for (const mov of rows) {
            const emoji = emojis[mov.accion] || '📦'
            const fecha = new Date(mov.fecha).toLocaleDateString('es-CO')
            texto += `${emoji} *${mov.accion.toUpperCase()}* — ${mov.item}\n📅 ${fecha}\n\n`
        }

        texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default historico
