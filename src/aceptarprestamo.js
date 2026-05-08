import db from './db.js'

const aceptarprestamo = {
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

        const [prestamista] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])

        if ((prestamista[0].monedas || 0) < solicitud.cantidad) {
            await sock.sendMessage(jid, {
                text: `❌ No tienes suficiente dinero en mano para prestar *${solicitud.cantidad} monedas*.\n\n💵 *Tu balance:* ${prestamista[0].monedas || 0} monedas`
            }, { quoted: mensaje })
            return
        }

        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [solicitud.cantidad, userJid])
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [solicitud.cantidad, solicitud.jid_deudor])
        await db.execute('UPDATE prestamos_usuarios SET estado = "activo" WHERE id = ?', [solicitud.id])

        await sock.sendMessage(jid, {
            text: `✅ Prestaste *${solicitud.cantidad} monedas* a @${solicitud.jid_deudor.split('@')[0]}.\n\n💵 *Tu balance:* ${(prestamista[0].monedas || 0) - solicitud.cantidad} monedas`,
            mentions: [solicitud.jid_deudor]
        }, { quoted: mensaje })

        await sock.sendMessage(jid, {
            text: `🎉 @${solicitud.jid_deudor.split('@')[0]} tu préstamo de *${solicitud.cantidad} monedas* fue aceptado.\n\n💡 Usa *.pagar @usuario <cantidad>* para devolver el dinero.`,
            mentions: [solicitud.jid_deudor]
        })
    }
}

export default aceptarprestamo
