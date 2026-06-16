import db from './db.js'
import { esOwner } from './owners.js'

const unmute = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.unmute @usuario*` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT id FROM usuarios_muteados WHERE jid = ?', [mencionado])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `⚠️ Ese usuario no está muteado.` }, { quoted: mensaje })
            return
        }

        await db.execute('DELETE FROM usuarios_muteados WHERE jid = ?', [mencionado])

        await sock.sendMessage(jid, {
            text: `🔊 *@${mencionado.split('@')[0]} ha sido desmuteado.*`,
            mentions: [mencionado]
        }, { quoted: mensaje })
    }
}

export default unmute
