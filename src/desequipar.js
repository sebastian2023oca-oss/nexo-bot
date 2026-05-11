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

        await sock.sendMessage(jid, {
            text: `✅ *${itemKey}* desequipado correctamente.`
        }, { quoted: mensaje })
    }
}

export default desequipar
