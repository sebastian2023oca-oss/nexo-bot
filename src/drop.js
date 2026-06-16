import db from './db.js'
import { esOwner } from './owners.js'

const drop = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        if (!args[0] || !args[1]) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.drop <item> <cantidad>*\n\n📌 Ejemplo: *.drop gema_mejora 1*`
            }, { quoted: mensaje })
            return
        }

        const item = args[0].toLowerCase()
        const cantidad = parseInt(args[1])

        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [tiendaRows] = await db.execute('SELECT * FROM tienda WHERE item = ?', [item])
        if (tiendaRows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ El ítem *${item}* no existe en la tienda.` }, { quoted: mensaje })
            return
        }

        const [usuarios] = await db.execute('SELECT jid FROM usuarios')

        if (usuarios.length === 0) {
            await sock.sendMessage(jid, { text: `⚠️ No hay usuarios registrados.` }, { quoted: mensaje })
            return
        }

        await sock.sendMessage(jid, {
            text: `🎁 *DROP INICIADO*\n\n📦 *Ítem:* ${item}\n💰 *Cantidad:* ${cantidad}\n👥 *Usuarios:* ${usuarios.length}\n\n⏳ Entregando...`
        }, { quoted: mensaje })

        for (const u of usuarios) {
            try {
                const [ya] = await db.execute('SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?', [u.jid, item])
                if (ya.length > 0) {
                    await db.execute('UPDATE inventario_usuario SET cantidad = cantidad + ? WHERE jid = ? AND item = ?', [cantidad, u.jid, item])
                } else {
                    await db.execute('INSERT INTO inventario_usuario (jid, item, cantidad) VALUES (?, ?, ?)', [u.jid, item, cantidad])
                }
                await db.execute('INSERT INTO historico_items (jid, accion, item, cantidad) VALUES (?, "drop", ?, ?)', [u.jid, item, cantidad])
            } catch {}
        }

        await sock.sendMessage(jid, {
            text: `✅ *DROP COMPLETADO*\n\n🎁 *${item}* x${cantidad} entregado a *${usuarios.length} usuarios*.\n\n📢 Los usuarios recibirán el ítem en su inventario.`
        }, { quoted: mensaje })
    }
}

export default drop
