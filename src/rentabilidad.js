import db from './db.js'

const rentabilidad = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT * FROM inversiones WHERE jid = ? ORDER BY fecha DESC LIMIT 5',
            [userJid]
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, {
                text: `📊 *RENTABILIDAD*\n\nNo tienes inversiones registradas.\n\n💡 Usa *.invertir <cantidad>* para empezar.`
            }, { quoted: mensaje })
            return
        }

        let texto = `📊 *TUS ÚLTIMAS INVERSIONES*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

        for (const inv of rows) {
            const emoji = inv.estado === 'completada' ? '✅' : inv.estado === 'perdida' ? '❌' : '⏳'
            texto += `${emoji} *${inv.cantidad} monedas* — ${inv.estado}\n📅 ${new Date(inv.fecha).toLocaleDateString('es-CO')}\n\n`
        }

        texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default rentabilidad
