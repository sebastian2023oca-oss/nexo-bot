import db from './db.js'
import { esOwner, OWNER_PRINCIPAL } from './owners.js'

const mute = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.mute @usuario*` }, { quoted: mensaje })
            return
        }

        if (mencionado === OWNER_PRINCIPAL || await esOwner(mencionado)) {
            await sock.sendMessage(jid, { text: `❌ No puedes mutear a un Owner.` }, { quoted: mensaje })
            return
        }

        const [ya] = await db.execute('SELECT id FROM usuarios_muteados WHERE jid = ?', [mencionado])
        if (ya.length > 0) {
            await sock.sendMessage(jid, { text: `⚠️ Ese usuario ya está muteado.` }, { quoted: mensaje })
            return
        }

        await db.execute('INSERT INTO usuarios_muteados (jid) VALUES (?)', [mencionado])

        await sock.sendMessage(jid, {
            text: `🔇 *@${mencionado.split('@')[0]} ha sido muteado. Nexo-Bot ignorará sus comandos.*`,
            mentions: [mencionado]
        }, { quoted: mensaje })
    }
}

export default mute
