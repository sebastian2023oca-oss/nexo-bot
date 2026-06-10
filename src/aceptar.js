import db from './db.js'

const OWNERS_JID = '120363425755647814@g.us'

const aceptar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid

        if (jid !== OWNERS_JID) return

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `❌ Debes indicar el  número de solicitud.\n\n📌 Ejemplo: *.aceptar 001*`
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

        const numeroSolicitud = String(id).padStart(3, '0')

        // Extraer código SIN modificar mayúsculas/minúsculas
        const codigo = solicitud.link.split('https://chat.whatsapp.com/')[1]?.split('?')[0]?.trim()

        if (!codigo) {
            await sock.sendMessage(jid, {
                text: `❌ El link de la solicitud *#${numeroSolicitud}* es inválido.`
            }, { quoted: mensaje })
            return
        }

        console.log(`🔗 Código original: ${codigo}`)

        try {
            await sock.groupAcceptInvite(codigo)

            await db.execute(
                'UPDATE solicitudes SET estado = "aceptada" WHERE id = ?',
                [id]
            )

            await sock.sendMessage(jid, {
                text: `✅ Solicitud *#${numeroSolicitud}* aceptada.\n\n🤖 El bot entró al grupo de *${solicitud.nombre}* correctamente.`
            }, { quoted: mensaje })

            await sock.sendMessage(solicitud.jid, {
                text: `🎉 *¡Tu solicitud ha sido aceptada!*\n\n📋 Solicitud: *#${numeroSolicitud}*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ El bot ya está en tu grupo.\n\nEscribe *.menu* para ver todos los comandos. 🚀`
            })

        } catch (err) {
            console.error('Error al unirse:', err.message)

            await sock.sendMessage(jid, {
                text: `⚠️ No se pudo unir al grupo.\n\n❌ *Error:* ${err.message}\n🔗 *Código:* ${codigo}\n\nEl link puede haber expirado. Pídele al usuario un link nuevo.`
            }, { quoted: mensaje })
        }
    }
}

export default aceptar