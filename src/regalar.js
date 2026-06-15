import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'

const OWNERS_JID = '120363425755647814@g.us'

const regalar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid
        const nombreSender = mensaje.pushName || 'Usuario'

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!args[0] || !mencionado) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.regalar <item> @usuario*` }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes regalarte a ti mismo.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'regalar', 1)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para regalar de nuevo.` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()

        const [invRows] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?',
            [userJid, itemKey]
        )

        if (invRows.length === 0 || invRows[0].cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes *${itemKey}* en tu inventario.` }, { quoted: mensaje })
            return
        }

        const [receptor] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])
        if (receptor.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado en el bot.` }, { quoted: mensaje })
            return
        }

        // Quitar del inventario del emisor
        if (invRows[0].cantidad <= 1) {
            await db.execute('DELETE FROM inventario_usuario WHERE jid = ? AND item = ?', [userJid, itemKey])
        } else {
            await db.execute('UPDATE inventario_usuario SET cantidad = cantidad - 1 WHERE jid = ? AND item = ?', [userJid, itemKey])
        }

        // Agregar al inventario del receptor
        const [yaExiste] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?',
            [mencionado, itemKey]
        )
        if (yaExiste.length > 0) {
            await db.execute('UPDATE inventario_usuario SET cantidad = cantidad + 1 WHERE jid = ? AND item = ?', [mencionado, itemKey])
        } else {
            await db.execute('INSERT INTO inventario_usuario (jid, item, cantidad) VALUES (?, ?, 1)', [mencionado, itemKey])
        }

        await db.execute('INSERT INTO historico_items (jid, accion, item) VALUES (?, "regalar", ?)', [userJid, itemKey])
        await registrarCooldown(userJid, 'regalar', 20)

        await sock.sendMessage(jid, {
            text: `🎁 *REGALO ENVIADO*\n\n✅ Le regalaste *${itemKey}* a @${mencionado.split('@')[0]}.`,
            mentions: [mencionado]
        }, { quoted: mensaje })

        await sock.sendMessage(OWNERS_JID, {
            text: `🎁 *REGALO DETECTADO*\n\n👤 *De:* @${userJid.split('@')[0]} (${nombreSender})\n👥 *Para:* @${mencionado.split('@')[0]}\n📦 *Ítem:* ${itemKey}\n📍 *Grupo:* ${jid}`,
            mentions: [userJid, mencionado]
        })
    }
}

export default regalar
