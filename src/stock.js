import db from './db.js'

const stock = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.stock <item>*\n\n📌 Ejemplo: *.stock espada_basica*` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()
        const [rows] = await db.execute('SELECT * FROM tienda WHERE item = ?', [itemKey])

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Ítem no encontrado.\n\n💡 Usa *.tienda* para ver los ítems disponibles.` }, { quoted: mensaje })
            return
        }

        const item = rows[0]
        const proximoReset = new Date(new Date(item.ultimo_stock_reset).getTime() + 10800000)
        const msRestante = proximoReset - Date.now()
        const horas = Math.floor(msRestante / 3600000)
        const mins = Math.floor((msRestante % 3600000) / 60000)

        await sock.sendMessage(jid, {
            text: `📦 *STOCK: ${item.nombre.toUpperCase()}*\n\n📦 *Disponible:* ${item.stock} unidades\n⏳ *Se restablece en:* ${horas}h ${mins}m`
        }, { quoted: mensaje })
    }
}

export default stock
