import db from './db.js'
import { esOwner } from './owners.js'

const addstock = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        if (!args[0] || !args[1]) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.addstock <cantidad> <item>*\n\n📌 Ejemplo: *.addstock 50 espada_basica*`
            }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        const item = args[1].toLowerCase()

        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM tienda WHERE item = ?', [item])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ El ítem *${item}* no existe en la tienda.` }, { quoted: mensaje })
            return
        }

        await db.execute('UPDATE tienda SET stock = stock + ? WHERE item = ?', [cantidad, item])

        await sock.sendMessage(jid, {
            text: `📦 *STOCK AÑADIDO*\n\n✅ *${item}* +${cantidad} unidades\n📦 *Nuevo stock:* ${rows[0].stock + cantidad}`
        }, { quoted: mensaje })
    }
}

export default addstock
