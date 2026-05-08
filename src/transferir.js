import db from './db.js'
import { cobrarImpuesto } from './utils.js'

const OWNERS_JID = '120363425755647814@g.us'
const IVA = 0.05

const transferir = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid
        const nombreSender = mensaje.pushName || 'Usuario'

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado || !args[1]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.transferir @usuario <cantidad>*` }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes transferirte dinero a ti mismo.` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[1])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [sender] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        const [receiver] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])

        if (sender.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if (receiver.length === 0) {
            await sock.sendMessage(jid, { text: `❌ El usuario mencionado no está registrado.` }, { quoted: mensaje })
            return
        }

        const iva = Math.floor(cantidad * IVA)
        const recibido = cantidad - iva
        const total = cantidad

        if ((sender[0].monedas || 0) < total) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero.\n\n💵 *Tu balance:* ${sender[0].monedas || 0} monedas` }, { quoted: mensaje })
            return
        }

        const impuesto = await cobrarImpuesto(userJid, sender[0].monedas)
        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [total, userJid])
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [recibido, mencionado])

        const nombreGrupo = jid.endsWith('@g.us') ? jid : 'Chat privado'

        await sock.sendMessage(jid, {
            text: `✅ *TRANSFERENCIA EXITOSA*\n\n👤 *Receptor:* @${mencionado.split('@')[0]}\n💸 *Enviado:* ${total.toLocaleString()} monedas\n🧾 *IVA (5%):* -${iva.toLocaleString()} monedas\n✅ *Recibido:* ${recibido.toLocaleString()} monedas\n💸 *Impuesto (0.5%):* -${impuesto} monedas\n\n💵 *Tu balance:* ${(sender[0].monedas || 0) - total - impuesto} monedas`,
            mentions: [mencionado]
        }, { quoted: mensaje })

        await sock.sendMessage(OWNERS_JID, {
            text: `💸 *TRANSFERENCIA DETECTADA*\n\n👤 *Emisor:* @${userJid.split('@')[0]} (${nombreSender})\n👥 *Receptor:* @${mencionado.split('@')[0]}\n💰 *Enviado:* ${total.toLocaleString()} monedas\n🧾 *IVA:* ${iva.toLocaleString()} monedas\n📍 *Grupo:* ${nombreGrupo}`,
            mentions: [userJid, mencionado]
        })
    }
}

export default transferir