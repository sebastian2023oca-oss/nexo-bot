import db from './db.js'
import { esOwner, OWNER_PRINCIPAL } from './owners.js'

const RECURSOS_VALIDOS = ['monedas', 'banco', 'xp', 'reputacion']

const penalizar = {
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
                text: `❌ Uso correcto: *.penalizar <recurso> <cantidad> @usuario*\n\n📌 Recursos: ${RECURSOS_VALIDOS.join(', ')}`
            }, { quoted: mensaje })
            return
        }

        if (mencionado === OWNER_PRINCIPAL) {
            await sock.sendMessage(jid, { text: `❌ No puedes penalizar al dueño del bot.` }, { quoted: mensaje })
            return
        }

        const recurso = args[0].toLowerCase()
        const cantidad = parseInt(args[1])

        if (!RECURSOS_VALIDOS.includes(recurso)) {
            await sock.sendMessage(jid, { text: `❌ Recurso inválido. Válidos: ${RECURSOS_VALIDOS.join(', ')}` }, { quoted: mensaje })
            return
        }

        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado.` }, { quoted: mensaje })
            return
        }

        const valorActual = rows[0][recurso] || 0
        const nuevoValor = Math.max(0, valorActual - cantidad)
        const penalizado = valorActual - nuevoValor

        await db.execute(`UPDATE usuarios SET ${recurso} = ? WHERE jid = ?`, [nuevoValor, mencionado])

        await sock.sendMessage(jid, {
            text: `⚠️ *PENALIZACIÓN APLICADA*\n\n👤 *Usuario:* @${mencionado.split('@')[0]}\n📦 *Recurso:* ${recurso}\n💰 *Penalizado:* -${penalizado}`,
            mentions: [mencionado]
        }, { quoted: mensaje })

        try {
            await sock.sendMessage(mencionado, {
                text: `⚠️ *Recibiste una penalización de un Owner*\n\n📦 *Recurso:* ${recurso}\n💰 *Cantidad:* -${penalizado}`
            })
        } catch {}
    }
}

export default penalizar
