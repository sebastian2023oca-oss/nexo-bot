import db from './db.js'
import { esOwner, OWNER_PRINCIPAL } from './owners.js'

const delowner = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.delowner @usuario*` }, { quoted: mensaje })
            return
        }

        if (mencionado === OWNER_PRINCIPAL) {
            await sock.sendMessage(jid, {
                text: `👑 *Este usuario es el dueño de Nexo-Bot, no lo puedes quitar de Owner.*`
            }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT id FROM owners WHERE jid = ?', [mencionado])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `⚠️ Ese usuario no es Owner.` }, { quoted: mensaje })
            return
        }

        await db.execute('DELETE FROM owners WHERE jid = ?', [mencionado])

        await sock.sendMessage(jid, {
            text: `✅ *@${mencionado.split('@')[0]} fue eliminado como Owner.*`,
            mentions: [mencionado]
        }, { quoted: mensaje })

        try {
            await sock.sendMessage(mencionado, {
                text: `⚠️ Tu rol de *Owner en Nexo-Bot* fue revocado.`
            })
        } catch {}
    }
}

export default delowner
