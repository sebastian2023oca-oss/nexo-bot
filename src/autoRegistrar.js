import db from './db.js'

// Asegurar tabla grupos_activos
async function asegurarTablaGrupos() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS grupos_activos (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            jid       VARCHAR(60) NOT NULL UNIQUE,
            nombre    VARCHAR(100),
            visto_en  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `)
}
await asegurarTablaGrupos()

async function autoRegistrar(sock, mensaje) {
    const jid = mensaje.key.participant || mensaje.key.remoteJid
    const nombre = mensaje.pushName || 'Usuario'
    const grupoJid = mensaje.key.remoteJid

    if (!jid) return

    // Registrar usuario
    const [rows] = await db.execute('SELECT id FROM usuarios WHERE jid = ?', [jid])
    if (rows.length === 0) {
        await db.execute('INSERT INTO usuarios (jid, nombre) VALUES (?, ?)', [jid, nombre])
        console.log(`👤 Nuevo usuario registrado: ${nombre} (${jid})`)

        await sock.sendMessage(grupoJid, {
            text: `🎉 *¡Felicidades, ${nombre}!*\n\nHas sido registrado en *Nexo Bot* correctamente.\n\nEscribe *.menu* para ver todos los comandos disponibles. 🚀`
        }, { quoted: mensaje })
    }

    // Registrar grupo
    if (grupoJid?.endsWith('@g.us')) {
        try {
            await db.execute(
                `INSERT INTO grupos_activos (jid, nombre) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE visto_en = NOW()`,
                [grupoJid, grupoJid]
            )
        } catch {}
    }
}

export default autoRegistrar