const avatar = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        // Si se menciona a alguien, mostrar su avatar
        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
        const targetJid = mencionado || userJid

        try {
            const url = await sock.profilePictureUrl(targetJid, 'image')

            await sock.sendMessage(jid, {
                image: { url },
                caption: `🖼️ *Foto de perfil de @${targetJid.split('@')[0]}*`,
                mentions: [targetJid]
            }, { quoted: mensaje })

        } catch (err) {
            await sock.sendMessage(jid, {
                text: `❌ No se pudo obtener la foto de perfil.\n\nEl usuario puede tener su foto de perfil privada.`
            }, { quoted: mensaje })
        }
    }
}

export default avatar
