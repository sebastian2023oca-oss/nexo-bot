import db from './db.js'
import { esOwner } from './owners.js'

const resetstock = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        await db.execute('UPDATE tienda SET stock = 10, ultimo_stock_reset = NOW()')

        await sock.sendMessage(jid, {
            text: `✅ *Stock reiniciado.*\n\n📦 Todos los ítems de la tienda tienen ahora *10 unidades*.`
        }, { quoted: mensaje })
    }
}

export default resetstock
