import db from './db.js'
import { esOwner } from './owners.js'

const ordenartienda = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        const [items] = await db.execute('SELECT * FROM tienda ORDER BY precio ASC')

        if (items.length === 0) {
            await sock.sendMessage(jid, { text: `⚠️ La tienda está vacía.` }, { quoted: mensaje })
            return
        }

        let texto = `🏪 *TIENDA ORDENADA POR PRECIO*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

        for (const item of items) {
            texto += `✦ *${item.nombre}* — ${item.precio.toLocaleString()} 💰\n`
            texto += `   📦 Stock: ${item.stock} | 🔑 \`${item.item}\`\n\n`
        }

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default ordenartienda
