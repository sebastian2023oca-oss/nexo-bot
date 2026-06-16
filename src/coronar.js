import { esOwner } from './owners.js'

const coronar = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.coronar @usuario*` }, { quoted: mensaje })
            return
        }

        if (!jid.endsWith('@g.us')) {
            await sock.sendMessage(jid, { text: `❌ Este comando solo funciona en grupos.` }, { quoted: mensaje })
            return
        }

        try {
            await sock.groupParticipantsUpdate(jid, [mencionado], 'promote')
            await sock.sendMessage(jid, {
                text: `👑 *@${mencionado.split('@')[0]} ahora es administrador del grupo.*`,
                mentions: [mencionado]
            }, { quoted: mensaje })
        } catch (err) {
            await sock.sendMessage(jid, {
                text: `❌ No pude dar admin. Asegúrate que el bot sea administrador del grupo.`
            }, { quoted: mensaje })
        }
    }
}

export default coronar
