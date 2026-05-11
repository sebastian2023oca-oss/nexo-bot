import db from './db.js'

const listar = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [inv] = await db.execute('SELECT * FROM inventario_usuario WHERE jid = ?', [userJid])
        const [bod] = await db.execute('SELECT * FROM bodega WHERE jid = ?', [userJid])
        const [user] = await db.execute('SELECT bodega_max FROM usuarios WHERE jid = ?', [userJid])

        const bodegaMax = user[0]?.bodega_max || 100

        let texto = `📋 *INVENTARIO DETALLADO*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        texto += `🎒 *Inventario principal:* ${inv.length} ítems\n`
        texto += `🏠 *Bodega:* ${bod.length}/${bodegaMax} ítems\n\n`

        if (inv.length > 0) {
            texto += `🎒 *PRINCIPAL*\n`
            for (const item of inv) {
                texto += `  ✦ ${item.item} x${item.cantidad}${item.equipado ? ' ⚡' : ''}\n`
            }
            texto += `\n`
        }

        if (bod.length > 0) {
            texto += `🏠 *BODEGA*\n`
            for (const item of bod) {
                texto += `  ✦ ${item.item} x${item.cantidad}\n`
            }
        }

        texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default listar
