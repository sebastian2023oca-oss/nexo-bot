import db from './db.js'

const estadosValidos = ['activo', 'ocupado', 'inactivo']

const setstatus = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `❌ Debes indicar un estado.\n\n📌 Estados disponibles: *activo*, *ocupado*, *inactivo*\n\nEjemplo: *.setstatus ocupado*`
            }, { quoted: mensaje })
            return
        }

        const estado = args[0].toLowerCase()

        if (!estadosValidos.includes(estado)) {
            await sock.sendMessage(jid, {
                text: `❌ Estado inválido.\n\n📌 Estados disponibles: *activo*, *ocupado*, *inactivo*`
            }, { quoted: mensaje })
            return
        }

        await db.execute('UPDATE usuarios SET status_perfil = ? WHERE jid = ?', [estado, userJid])

        await sock.sendMessage(jid, {
            text: `✅ *Estado actualizado a:* ${estado}`
        }, { quoted: mensaje })
    }
}

export default setstatus
