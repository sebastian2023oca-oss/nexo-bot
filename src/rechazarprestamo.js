import db from './db.js'

const rechazarprestamo = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [solicitudes] = await db.execute(
            'SELECT * FROM prestamos_usuarios WHERE jid_prestamista = ? AND estado = "pendiente" ORDER BY fecha DESC LIMIT 1',
            [userJid]
        )

        if (solicitudes.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes solicitudes de préstamo pendientes.` }, { quoted: mensaje })
            return
        }

        const solicitud = solicitudes[0]

        await db.execute('UPDATE prestamos_usuarios SET estado = "rechazado" WHERE id = ?', [solicitud.id])

        await sock.sendMessage(jid, {
            text: `🚫 Rechazaste la solicitud de préstamo de @${solicitud.jid_deudor.split('@')[0]}.`,
            mentions: [solicitud.jid_deudor]
        }, { quoted: mensaje })

        await sock.sendMessage(jid, {
            text: `❌ @${solicitud.jid_deudor.split('@')[0]} tu solicitud de préstamo fue rechazada.`,
            mentions: [solicitud.jid_deudor]
        })
    }
}

export default rechazarprestamo
