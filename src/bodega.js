import db from './db.js'

const bodega = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute('SELECT * FROM bodega WHERE jid = ?', [userJid])
        const [user] = await db.execute('SELECT bodega_max FROM usuarios WHERE jid = ?', [userJid])

        const bodegaMax = user[0]?.bodega_max || 100

        if (rows.length === 0) {
            await sock.sendMessage(jid, {
                text: `🏠 *TU BODEGA*\n\n📦 *Capacidad:* 0/${bodegaMax} ítems\n\nTu bodega está vacía.\n\n💡 Usa *.almacenar <item>* para guardar ítems.`
            }, { quoted: mensaje })
            return
        }

        let texto = `🏠 *TU BODEGA* (${rows.length}/${bodegaMax})\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

        for (const item of rows) {
            texto += `✦ *${item.item}* x${item.cantidad}\n`
        }

        texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n💡 Usa *.sacar <item>* para recuperar ítems`

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default bodega
