import db from './db.js'

const cancelarreto = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [retos] = await db.execute(
            'SELECT * FROM casino_retos WHERE jid_retador = ? AND estado = "pendiente" ORDER BY fecha DESC LIMIT 1',
            [userJid]
        )

        if (retos.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes retos pendientes enviados.` }, { quoted: mensaje })
            return
        }

        const reto = retos[0]
        await db.execute('UPDATE casino_retos SET estado = "cancelado" WHERE id = ?', [reto.id])

        await sock.sendMessage(jid, {
            text: `🚫 Cancelaste el reto enviado a @${reto.jid_retado.split('@')[0]}.`,
            mentions: [reto.jid_retado]
        }, { quoted: mensaje })
    }
}

export default cancelarreto
