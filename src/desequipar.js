import db from './db.js'

const desequipar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.desequipar <item>*` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()

        const [rows] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = ? AND equipado = 1',
            [userJid, itemKey]
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes *${itemKey}* equipado.` }, { quoted: mensaje })
            return
        }

        await db.execute('UPDATE inventario_usuario SET equipado = 0 WHERE jid = ? AND item = ?', [userJid, itemKey])

        // Capa sigilo: limpiar items_activos y poner cooldown
        if (itemKey === 'capa_sigilo') {
            await db.execute('DELETE FROM items_activos WHERE jid = ? AND item = "capa_sigilo"', [userJid])
            await db.execute(
                'INSERT INTO cooldowns (jid, tipo, expira) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE)) ON DUPLICATE KEY UPDATE expira = DATE_ADD(NOW(), INTERVAL 15 MINUTE)',
                [userJid, 'equipar_capa_sigilo']
            )
            await sock.sendMessage(jid, {
                text: `✅ *capa_sigilo* desequipada.\n\n⏳ Cooldown de *15 minutos* para volver a equiparla.`
            }, { quoted: mensaje })
            return
        }

        await sock.sendMessage(jid, {
            text: `✅ *${itemKey}* desequipado correctamente.`
        }, { quoted: mensaje })
    }
}

export default desequipar