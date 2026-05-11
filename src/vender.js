import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'

const vender = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.vender <item>*` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'vender', 20)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para vender de nuevo.` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()

        const [invRows] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?',
            [userJid, itemKey]
        )

        if (invRows.length === 0 || invRows[0].cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes *${itemKey}* en tu inventario.` }, { quoted: mensaje })
            return
        }

        const [tiendaRows] = await db.execute('SELECT * FROM tienda WHERE item = ?', [itemKey])

        if (tiendaRows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Este ítem no tiene precio de reventa.` }, { quoted: mensaje })
            return
        }

        // Precio de venta = 25% del precio original
        const precioVenta = Math.floor(tiendaRows[0].precio * 0.25)

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [precioVenta, userJid])

        if (invRows[0].cantidad <= 1) {
            await db.execute('DELETE FROM inventario_usuario WHERE jid = ? AND item = ?', [userJid, itemKey])
        } else {
            await db.execute('UPDATE inventario_usuario SET cantidad = cantidad - 1 WHERE jid = ? AND item = ?', [userJid, itemKey])
        }

        await db.execute('INSERT INTO historico_items (jid, accion, item, precio) VALUES (?, "vender", ?, ?)', [userJid, itemKey, precioVenta])
        await registrarCooldown(userJid, 'vender', 20)

        await sock.sendMessage(jid, {
            text: `💸 *ÍTEM VENDIDO*\n\n✅ Vendiste *${itemKey}* por *${precioVenta.toLocaleString()} monedas*.\n\n⚠️ Los ítems se venden al *25%* de su valor original.\n💰 *Precio original:* ${tiendaRows[0].precio.toLocaleString()} monedas`
        }, { quoted: mensaje })
    }
}

export default vender
