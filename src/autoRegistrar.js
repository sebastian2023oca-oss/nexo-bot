import db from './db.js'

async function autoRegistrar(sock, mensaje) {
    const jid = mensaje.key.participant || mensaje.key.remoteJid
    const nombre = mensaje.pushName || 'Usuario'

    if (!jid) return

    const [rows] = await db.execute(
        'SELECT id FROM usuarios WHERE jid = ?',
        [jid]
    )

    if (rows.length === 0) {
        await db.execute(
            'INSERT INTO usuarios (jid, nombre) VALUES (?, ?)',
            [jid, nombre]
        )
        console.log(`👤 Nuevo usuario registrado: ${nombre} (${jid})`)

        const chatJid = mensaje.key.remoteJid

        await sock.sendMessage(chatJid, {
            text: `🎉 *¡Felicidades, ${nombre}!*\n\nHas sido registrado en *Nexo Bot* correctamente.\n\nEscribe *.menu* para ver todos los comandos disponibles. 🚀`
        }, { quoted: mensaje })
    }
}

export default autoRegistrar