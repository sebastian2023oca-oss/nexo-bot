import db from './db.js'

const resetperfil = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        await db.execute(
            'UPDATE usuarios SET bio = NULL, status_perfil = "activo", nombre_perfil = NULL WHERE jid = ?',
            [userJid]
        )

        await sock.sendMessage(jid, {
            text: `✅ *Perfil reiniciado correctamente.*\n\nTu bio, nombre y estado han sido restablecidos.`
        }, { quoted: mensaje })
    }
}

export default resetperfil
