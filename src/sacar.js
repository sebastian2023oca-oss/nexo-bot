import db from './db.js'

const sacar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.sacar <item>*` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()

        const [bodRows] = await db.execute(
            'SELECT * FROM bodega WHERE jid = ? AND item = ?',
            [userJid, itemKey]
        )

        if (bodRows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes *${itemKey}* en tu bodega.` }, { quoted: mensaje })
            return
        }

        if (bodRows[0].cantidad <= 1) {
            await db.execute('DELETE FROM bodega WHERE jid = ? AND item = ?', [userJid, itemKey])
        } else {
            await db.execute('UPDATE bodega SET cantidad = cantidad - 1 WHERE jid = ? AND item = ?', [userJid, itemKey])
        }

        const [yaEnInv] = await db.execute('SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?', [userJid, itemKey])
        if (yaEnInv.length > 0) {
            await db.execute('UPDATE inventario_usuario SET cantidad = cantidad + 1 WHERE jid = ? AND item = ?', [userJid, itemKey])
        } else {
            await db.execute('INSERT INTO inventario_usuario (jid, item, cantidad) VALUES (?, ?, 1)', [userJid, itemKey])
        }

        await sock.sendMessage(jid, {
            text: `✅ *${itemKey}* sacado de la bodega y añadido a tu inventario.`
        }, { quoted: mensaje })
    }
}

export default sacar
