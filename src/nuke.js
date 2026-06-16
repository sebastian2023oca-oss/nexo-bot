import { esOwner } from './owners.js'

const nuke = {
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
            const participantes = metadata.participants
                .filter(p => p.id !== userJid && p.admin !== 'superadmin')
                .map(p => p.id)

            if (participantes.length === 0) {
                await sock.sendMessage(jid, { text: `⚠️ No hay usuarios para expulsar.` }, { quoted: mensaje })
                return
            }

            await sock.sendMessage(jid, { text: `💣 *NUKE activado. Expulsando ${participantes.length} usuarios...*` }, { quoted: mensaje })

            // Expulsar en lotes de 5
            for (let i = 0; i < participantes.length; i += 5) {
                const lote = participantes.slice(i, i + 5)
                try {
                    await sock.groupParticipantsUpdate(jid, lote, 'remove')
                } catch {}
                await new Promise(r => setTimeout(r, 500))
            }

            await sock.sendMessage(jid, { text: `✅ *Nuke completado. ${participantes.length} usuarios expulsados.*` }, { quoted: mensaje })
        } catch {
            await sock.sendMessage(jid, { text: `❌ Error. El bot debe ser admin del grupo.` }, { quoted: mensaje })
        }
    }
}

export default nuke
