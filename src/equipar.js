import db from './db.js'

const equipar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.equipar <item>*` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()

        const [rows] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?',
            [userJid, itemKey]
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes *${itemKey}* en tu inventario.` }, { quoted: mensaje })
            return
        }

        if (rows[0].equipado) {
            await sock.sendMessage(jid, { text: `⚠️ *${itemKey}* ya está equipado.` }, { quoted: mensaje })
            return
        }

        await db.execute('UPDATE inventario_usuario SET equipado = 1 WHERE jid = ? AND item = ?', [userJid, itemKey])

        await sock.sendMessage(jid, {
            text: `⚡ *ÍTEM EQUIPADO*\n\n✅ Equipaste *${itemKey}* correctamente.\n\nSus beneficios están activos.`
        }, { quoted: mensaje })
    }
}

export default equipar
