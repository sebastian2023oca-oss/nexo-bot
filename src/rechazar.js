import db from './db.js'

const OWNERS_JID = '120363425755647814@g.us'

const rechazar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid

        // Solo funciona en el grupo owners
        if (jid !== OWNERS_JID) return

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `❌ Debes indicar el número de solicitud.\n\n📌 Ejemplo: *.rechazar 001*`
            }, { quoted: mensaje })
            return
        }

        const id = parseInt(args[0])

        const [rows] = await db.execute(
            'SELECT * FROM solicitudes WHERE id = ?',
            [id]
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, {
                text: `❌ No existe la solicitud *#${String(id).padStart(3, '0')}*.`
            }, { quoted: mensaje })
            return
        }

        const solicitud = rows[0]

        if (solicitud.estado !== 'pendiente') {
            await sock.sendMessage(jid, {
                text: `⚠️ La solicitud *#${String(id).padStart(3, '0')}* ya fue *${solicitud.estado}*.`
            }, { quoted: mensaje })
            return
        }

        // Actualizar estado en la base de datos
        await db.execute(
            'UPDATE solicitudes SET estado = "rechazada" WHERE id = ?',
            [id]
        )

        const numeroSolicitud = String(id).padStart(3, '0')

        // Notificar en el grupo owners
        await sock.sendMessage(jid, {
            text: `🚫 Solicitud *#${numeroSolicitud}* de *${solicitud.nombre}* rechazada.`
        }, { quoted: mensaje })

        // Notificar al usuario
        await sock.sendMessage(solicitud.jid, {
            text: `❌ *Tu solicitud ha sido rechazada.*\n\n📋 Solicitud: *#${numeroSolicitud}*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚠️ Posibles motivos:\n   • El grupo tiene menos de *10 integrantes*\n   • El link era inválido o expirado\n   • No cumple los requisitos del bot\n\n💬 Si crees que es un error puedes\n   enviar una nueva solicitud.`
        })
    }
}

export default rechazar