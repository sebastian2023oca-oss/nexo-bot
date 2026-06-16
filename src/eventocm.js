import db from './db.js'
import { esOwner } from './owners.js'

const eventocm = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        if (!args[0] || !args[1] || !args[2]) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.eventocm <tipo> <valor> <cantidad>*\n\n📌 Tipos: *monedas*, *banco*, *xp*, *item*\n\n📌 Ejemplos:\n*.eventocm monedas 500*\n*.eventocm item gema_mejora 2*`
            }, { quoted: mensaje })
            return
        }

        const tipo = args[0].toLowerCase()
        const tiposValidos = ['monedas', 'banco', 'xp', 'item']

        if (!tiposValidos.includes(tipo)) {
            await sock.sendMessage(jid, { text: `❌ Tipo inválido. Usa: ${tiposValidos.join(', ')}` }, { quoted: mensaje })
            return
        }

        const [usuarios] = await db.execute('SELECT jid FROM usuarios')

        if (usuarios.length === 0) {
            await sock.sendMessage(jid, { text: `⚠️ No hay usuarios registrados.` }, { quoted: mensaje })
            return
        }

        if (tipo === 'item') {
            const item = args[1].toLowerCase()
            const cantidad = parseInt(args[2]) || 1

            const [tiendaRows] = await db.execute('SELECT * FROM tienda WHERE item = ?', [item])
            if (tiendaRows.length === 0) {
                await sock.sendMessage(jid, { text: `❌ El ítem *${item}* no existe.` }, { quoted: mensaje })
                return
            }

            await sock.sendMessage(jid, {
                text: `🎉 *EVENTO INICIADO*\n\n🎁 Regalando *${item}* x${cantidad} a ${usuarios.length} usuarios...\n\n⏳ Por favor espera...`
            }, { quoted: mensaje })

            for (const u of usuarios) {
                try {
                    const [ya] = await db.execute('SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?', [u.jid, item])
                    if (ya.length > 0) {
                        await db.execute('UPDATE inventario_usuario SET cantidad = cantidad + ? WHERE jid = ? AND item = ?', [cantidad, u.jid, item])
                    } else {
                        await db.execute('INSERT INTO inventario_usuario (jid, item, cantidad) VALUES (?, ?, ?)', [u.jid, item, cantidad])
                    }
                } catch {}
            }

            await sock.sendMessage(jid, {
                text: `✅ *EVENTO COMPLETADO*\n\n🎁 *${item}* x${cantidad} entregado a *${usuarios.length} usuarios*.`
            }, { quoted: mensaje })

        } else {
            const cantidad = parseInt(args[1])
            if (isNaN(cantidad) || cantidad <= 0) {
                await sock.sendMessage(jid, { text: `❌ La cantidad debe ser mayor a 0.` }, { quoted: mensaje })
                return
            }

            await sock.sendMessage(jid, {
                text: `🎉 *EVENTO INICIADO*\n\n💰 Regalando *${cantidad} ${tipo}* a ${usuarios.length} usuarios...`
            }, { quoted: mensaje })

            await db.execute(`UPDATE usuarios SET ${tipo} = ${tipo} + ?`, [cantidad])

            await sock.sendMessage(jid, {
                text: `✅ *EVENTO COMPLETADO*\n\n💰 *+${cantidad} ${tipo}* dado a *${usuarios.length} usuarios*.`
            }, { quoted: mensaje })
        }
    }
}

export default eventocm
