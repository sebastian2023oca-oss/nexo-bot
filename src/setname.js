import db from './db.js'

const setname = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `❌ Debes escribir un nombre.\n\n📌 Ejemplo: *.setname MiNombre*`
            }, { quoted: mensaje })
            return
        }

        const nombre = args.join(' ').slice(0, 80)

        await db.execute('UPDATE usuarios SET nombre_perfil = ? WHERE jid = ?', [nombre, userJid])

        await sock.sendMessage(jid, {
            text: `✅ *Nombre actualizado a:* ${nombre}`
        }, { quoted: mensaje })
    }
}

export default setname
