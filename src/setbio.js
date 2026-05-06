import db from './db.js'

const setbio = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `❌ Debes escribir tu biografía.\n\n📌 Ejemplo: *.setbio Me encanta usar el bot*`
            }, { quoted: mensaje })
            return
        }

        const bio = args.join(' ').slice(0, 200)

        await db.execute('UPDATE usuarios SET bio = ? WHERE jid = ?', [bio, userJid])

        await sock.sendMessage(jid, {
            text: `✅ *Biografía actualizada.*\n\n📝 *Nueva bio:* ${bio}`
        }, { quoted: mensaje })
    }
}

export default setbio
