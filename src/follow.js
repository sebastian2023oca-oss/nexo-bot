import db from './db.js'

const follow = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, {
                text: `❌ Debes mencionar a un usuario.\n\n📌 Ejemplo: *.follow @usuario*`
            }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, {
                text: `❌ No puedes seguirte a ti mismo.`
            }, { quoted: mensaje })
            return
        }

        const [existe] = await db.execute(
            'SELECT id FROM seguidores WHERE jid_seguidor = ? AND jid_seguido = ?',
            [userJid, mencionado]
        )

        if (existe.length > 0) {
            await sock.sendMessage(jid, {
                text: `⚠️ Ya sigues a este usuario.`
            }, { quoted: mensaje })
            return
        }

        await db.execute(
            'INSERT INTO seguidores (jid_seguidor, jid_seguido) VALUES (?, ?)',
            [userJid, mencionado]
        )

        await sock.sendMessage(jid, {
            text: `✅ Ahora sigues a *@${mencionado.split('@')[0]}*.`,
            mentions: [mencionado]
        }, { quoted: mensaje })
    }
}

export default follow
