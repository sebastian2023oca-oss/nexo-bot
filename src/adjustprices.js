import db from './db.js'
import { esOwner } from './owners.js'

const adjustprices = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        if (!args[0] || !args[1]) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.adjustprices <item> <precio>*\n\n📌 Ejemplo: *.adjustprices espada_basica 8000*\n\n⚠️ El precio volverá a variar dinámicamente cuando pase el tiempo normal.`
            }, { quoted: mensaje })
            return
        }

        const item = args[0].toLowerCase()
        const precio = parseInt(args[1])

        if (isNaN(precio) || precio <= 0) {
            await sock.sendMessage(jid, { text: `❌ El precio debe ser mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM tienda WHERE item = ?', [item])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ El ítem *${item}* no existe en la tienda.` }, { quoted: mensaje })
            return
        }

        await db.execute(
            'UPDATE tienda SET precio = ?, ultimo_precio_cambio = NOW() WHERE item = ?',
            [precio, item]
        )

        await sock.sendMessage(jid, {
            text: `💰 *PRECIO AJUSTADO*\n\n✅ *${rows[0].nombre}*\n💵 *Precio anterior:* ${rows[0].precio.toLocaleString()} monedas\n💵 *Precio nuevo:* ${precio.toLocaleString()} monedas`
        }, { quoted: mensaje })
    }
}

export default adjustprices
