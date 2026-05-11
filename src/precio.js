import db from './db.js'

const precio = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.precio <item>*\n\n📌 Ejemplo: *.precio espada_basica*` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()
        const [rows] = await db.execute('SELECT * FROM tienda WHERE item = ?', [itemKey])

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Ítem no encontrado.\n\n💡 Usa *.tienda* para ver los ítems disponibles.` }, { quoted: mensaje })
            return
        }

        const item = rows[0]
        const proximoCambio = new Date(new Date(item.ultimo_precio_cambio).getTime() + 172800000)
        const msRestante = proximoCambio - Date.now()
        const horas = Math.floor(msRestante / 3600000)
        const mins = Math.floor((msRestante % 3600000) / 60000)

        await sock.sendMessage(jid, {
            text: `💰 *PRECIO: ${item.nombre.toUpperCase()}*\n\n💵 *Precio actual:* ${item.precio.toLocaleString()} monedas\n📦 *Stock:* ${item.stock}\n📝 *Descripción:* ${item.descripcion}\n\n⏳ *Próximo cambio de precio en:* ${horas}h ${mins}m`
        }, { quoted: mensaje })
    }
}

export default precio
