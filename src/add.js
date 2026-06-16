import db from './db.js'
import { esOwner } from './owners.js'

const RECURSOS_VALIDOS = ['monedas', 'banco', 'xp', 'nivel', 'reputacion']

const add = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!args[0] || !args[1] || !mencionado) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.add <recurso> <cantidad> @usuario*\n\n📌 Recursos válidos: ${RECURSOS_VALIDOS.join(', ')}`
            }, { quoted: mensaje })
            return
        }

        const recurso = args[0].toLowerCase()
        const cantidad = parseInt(args[1])

        if (!RECURSOS_VALIDOS.includes(recurso)) {
            await sock.sendMessage(jid, {
                text: `❌ Recurso inválido.\n\n📌 Válidos: ${RECURSOS_VALIDOS.join(', ')}`
            }, { quoted: mensaje })
            return
        }

        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado en el bot.` }, { quoted: mensaje })
            return
        }

        await db.execute(`UPDATE usuarios SET ${recurso} = ${recurso} + ? WHERE jid = ?`, [cantidad, mencionado])

        await sock.sendMessage(jid, {
            text: `✅ *RECURSO AÑADIDO*\n\n👤 *Usuario:* @${mencionado.split('@')[0]}\n📦 *Recurso:* ${recurso}\n💰 *Cantidad:* +${cantidad}`,
            mentions: [mencionado]
        }, { quoted: mensaje })

        // Notificar al usuario
        try {
            await sock.sendMessage(mencionado, {
                text: `🎁 *¡Recibiste un regalo de un Owner!*\n\n📦 *Recurso:* ${recurso}\n💰 *Cantidad:* +${cantidad}`
            })
        } catch {}
    }
}

export default add
