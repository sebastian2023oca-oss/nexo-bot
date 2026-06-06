import db from './db.js'

async function actualizarPrecios() {
    const [items] = await db.execute('SELECT * FROM tienda')
    for (const item of items) {
        const diff = Date.now() - new Date(item.ultimo_precio_cambio).getTime()
        if (diff >= 172800000) {
            const variacion = (Math.random() * 0.4) - 0.2
            const minPrecio = item.item === 'capa_sigilo' ? 100000 : 100
const nuevoPrecio = Math.max(minPrecio, Math.floor(item.precio * (1 + variacion)))
            await db.execute('UPDATE tienda SET precio = ?, ultimo_precio_cambio = NOW() WHERE id = ?', [nuevoPrecio, item.id])
        }
    }
}

async function restablecerStock() {
    const [items] = await db.execute('SELECT * FROM tienda')
    for (const item of items) {
        const diff = Date.now() - new Date(item.ultimo_stock_reset).getTime()
        if (diff >= 10800000) {
            await db.execute('UPDATE tienda SET stock = 10, ultimo_stock_reset = NOW() WHERE id = ?', [item.id])
        }
    }
}

const tienda = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        await actualizarPrecios()
        await restablecerStock()

        const [items] = await db.execute('SELECT * FROM tienda ORDER BY categoria, precio')

        if (items.length === 0) {
            await sock.sendMessage(jid, { text: `🏪 La tienda está vacía por el momento.` }, { quoted: mensaje })
            return
        }

        const categorias = {}
        for (const item of items) {
            if (!categorias[item.categoria]) categorias[item.categoria] = []
            categorias[item.categoria].push(item)
        }

        const emojis = {
            armas: '⚔️', armadura: '🛡️', pociones: '🧪', accesorios: '💍',
            utilidad: '🔧', herramientas: '⛏️', cajas: '🎁', materiales: '💎', especial: '⭐'
        }

        let texto = `🏪 *TIENDA GENERAL*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

        for (const [cat, catItems] of Object.entries(categorias)) {
            texto += `${emojis[cat] || '📦'} *${cat.toUpperCase()}*\n\n`
            for (const item of catItems) {
                texto += `  ✦ *${item.nombre}* — ${item.precio.toLocaleString()} 💰\n`
                texto += `     📦 Stock: ${item.stock} | 🔑 \`${item.item}\`\n\n`
            }
            texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        }

        texto += `💡 Usa *.comprar <código>* para comprar\n💡 Usa *.precio <código>* para ver precio actual`

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default tienda