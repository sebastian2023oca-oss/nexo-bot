import { esOwner } from './owners.js'

const demoteall = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        if (!jid.endsWith('@g.us')) {
            await sock.sendMessage(jid, { text: `❌ Solo funciona en grupos.` }, { quoted: mensaje })
            return
        }

        try {
            const metadata = await sock.groupMetadata(jid)
            const admins = metadata.participants
                .filter(p => p.admin === 'admin' && p.id !== userJid)
                .map(p => p.id)

            if (admins.length === 0) {
                await sock.sendMessage(jid, { text: `⚠️ No hay administradores que quitar.` }, { quoted: mensaje })
                return
            }

            await sock.groupParticipantsUpdate(jid, admins, 'demote')

            await sock.sendMessage(jid, {
                text: `✅ *Se quitó el rol de admin a ${admins.length} usuario(s).*`
            }, { quoted: mensaje })
        } catch {
            await sock.sendMessage(jid, { text: `❌ Error. Asegúrate que el bot sea admin del grupo.` }, { quoted: mensaje })
        }
    }
}

export default demoteall
