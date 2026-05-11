import db from './db.js'

const almacenar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.almacenar <item>*` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()

        const [invRows] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?',
            [userJid, itemKey]
        )

        if (invRows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes *${itemKey}* en tu inventario.` }, { quoted: mensaje })
            return
        }

        const [user] = await db.execute('SELECT bodega_max FROM usuarios WHERE jid = ?', [userJid])
        const bodegaMax = user[0]?.bodega_max || 100

        const [bodegaCount] = await db.execute(
            'SELECT SUM(cantidad) as total FROM bodega WHERE jid = ?',
            [userJid]
        )

        if ((bodegaCount[0].total || 0) >= bodegaMax) {
            await sock.sendMessage(jid, {
                text: `❌ Tu bodega está llena (*${bodegaMax}/${bodegaMax}*).\n\n💡 Compra una mejora de bodega en *.shopcoins*`
            }, { quoted: mensaje })
            return
        }

        // Mover al inventario a bodega
        if (invRows[0].cantidad <= 1) {
            await db.execute('DELETE FROM inventario_usuario WHERE jid = ? AND item = ?', [userJid, itemKey])
        } else {
            await db.execute('UPDATE inventario_usuario SET cantidad = cantidad - 1 WHERE jid = ? AND item = ?', [userJid, itemKey])
        }

        const [yaEnBodega] = await db.execute('SELECT * FROM bodega WHERE jid = ? AND item = ?', [userJid, itemKey])
        if (yaEnBodega.length > 0) {
            await db.execute('UPDATE bodega SET cantidad = cantidad + 1 WHERE jid = ? AND item = ?', [userJid, itemKey])
        } else {
            await db.execute('INSERT INTO bodega (jid, item, cantidad) VALUES (?, ?, 1)', [userJid, itemKey])
        }

        await sock.sendMessage(jid, {
            text: `🏠 *ÍTEM ALMACENADO*\n\n✅ *${itemKey}* guardado en tu bodega.`
        }, { quoted: mensaje })
    }
}

export default almacenar
