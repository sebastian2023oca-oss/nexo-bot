import db from './db.js'

const OWNERS_JID = '120363425755647814@g.us'

const addbot = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const nombre = mensaje.pushName || 'Usuario'
        const userJid = jid

        // Solo funciona en privado
        if (jid.endsWith('@g.us')) {
            await sock.sendMessage(jid, {
                text: `⚠️ Este comando solo funciona en el chat privado del bot.\n\nEscríbeme directamente y usa *.addbot <link del grupo>*`
            }, { quoted: mensaje })
            return
        }

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `⚠️ *Este bot solo funciona en grupos.*\n\nPara añadirlo a tu grupo usa:\n  ✦ *.addbot <link del grupo>* (sin las <>)\n\n  📌 Ejemplo:\n  *.addbot https://chat.whatsapp.com/xxxxxx*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            }, { quoted: mensaje })
            return
        }

        const link = args[0]

        if (!link.startsWith('https://chat.whatsapp.com/')) {
            await sock.sendMessage(jid, {
                text: `❌ *Link inválido.*\n\nEl link debe ser un enlace de grupo de WhatsApp.\n\n  📌 Ejemplo:\n  *.addbot https://chat.whatsapp.com/xxxxxx*`
            }, { quoted: mensaje })
            return
        }

        const [result] = await db.execute(
            'INSERT INTO solicitudes (jid, nombre, link) VALUES (?, ?, ?)',
            [userJid, nombre, link]
        )

        const numeroSolicitud = String(result.insertId).padStart(3, '0')

        await sock.sendMessage(jid, {
            text: `✅ *¡Tu solicitud ha sido enviada!* 🎉\n\n📋 Número de solicitud: *#${numeroSolicitud}*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⏳ Por favor ten paciencia, no siempre\n   podré aceptar las solicitudes de\n   inmediato.\n\n⚠️ *Requisito obligatorio:*\n   El grupo debe tener mínimo *10 integrantes*\n   para que el bot pueda unirse.\n\n   El incumplimiento de esto resultará\n   en una *penalización del bot.* 🚫\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        }, { quoted: mensaje })

        await sock.sendMessage(OWNERS_JID, {
            text: `📩 *Nueva solicitud de addbot*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n👤 *Usuario:* ${nombre}\n📱 *JID:* ${userJid}\n🔗 *Link:* ${link}\n📋 *Solicitud:* #${numeroSolicitud}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        })

        console.log(`📩 Nueva solicitud #${numeroSolicitud} de ${nombre} (${userJid}): ${link}`)
    }
}

export default addbot