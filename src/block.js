import db from './db.js'

const block = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, {
                text: `❌ Debes mencionar a un usuario.\n\n📌 Ejemplo: *.block @usuario*`
            }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, {
                text: `❌ No puedes bloquearte a ti mismo.`
            }, { quoted: mensaje })
            return
        }

        const [existe] = await db.execute(
            'SELECT id FROM bloqueados WHERE jid_bloqueador = ? AND jid_bloqueado = ?',
            [userJid, mencionado]
        )

        if (existe.length > 0) {
            await sock.sendMessage(jid, {
                text: `⚠️ Ya tienes bloqueado a este usuario.`
            }, { quoted: mensaje })
            return
        }

        await db.execute(
            'INSERT INTO bloqueados (jid_bloqueador, jid_bloqueado) VALUES (?, ?)',
            [userJid, mencionado]
        )

        await sock.sendMessage(jid, {
            text: `🚫 Has bloqueado a *@${mencionado.split('@')[0]}*.`,
            mentions: [mencionado]
        }, { quoted: mensaje })
    }
}

export default block
