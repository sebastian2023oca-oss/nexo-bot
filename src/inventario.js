import db from './db.js'

const inventario = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? ORDER BY item',
            [userJid]
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `🎒 *INVENTARIO*\n\nTu inventario está vacío.\n\n💡 Usa *.tienda* para ver qué puedes comprar.` }, { quoted: mensaje })
            return
        }

        let texto = `🎒 *TU INVENTARIO* (${rows.length} ítems)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

        for (const item of rows) {
            const equipadoTag = item.equipado ? ' ⚡ *[EQUIPADO]*' : ''
            const nivelMejora = Number(item.nivel_mejora || 0)
            const mejoraTag = nivelMejora > 0 ? ` 🚀 +${nivelMejora}` : ''
            texto += `✦ *${item.item}* x${item.cantidad}${mejoraTag}${equipadoTag}\n`
        }

        texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n💡 Usa *.usar <item>* para activar un objeto`

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default inventario
