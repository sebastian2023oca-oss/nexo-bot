import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'

const robar_item = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'robar_item', 60)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para intentar robar un ítem de nuevo.` }, { quoted: mensaje })
            return
        }

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, {
                text: `❌ Debes mencionar a un usuario.\n\n📌 Ejemplo: *.robar_item @usuario*`
            }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes robarte a ti mismo.` }, { quoted: mensaje })
            return
        }

        const [robador] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        const [victima] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])

        if (robador.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }
        if (victima.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado.` }, { quoted: mensaje })
            return
        }

        // Solo ítems del inventario principal (no bodega)
        const [itemsVictima] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ?',
            [mencionado]
        )

        if (itemsVictima.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Esa persona no tiene ítems en su inventario.` }, { quoted: mensaje })
            return
        }

        // Verificar capa_sigilo de la víctima → -50% probabilidad de robo
        const [capa] = await db.execute(
            'SELECT * FROM items_activos WHERE jid = ? AND item = "capa_sigilo" AND expira > NOW()',
            [mencionado]
        )

        const probabilidad = capa.length > 0 ? 0.2 : 0.4

        await registrarCooldown(userJid, 'robar_item', 60)

        if (Math.random() > probabilidad) {
            await sock.sendMessage(jid, {
                text: `👮 *¡TE ATRAPARON!*\n\nIntentaste robarle a @${mencionado.split('@')[0]} pero fallaste.${capa.length > 0 ? '\n\n🧥 Tenía una *Capa de Sigilo* equipada.' : ''}`,
                mentions: [mencionado]
            }, { quoted: mensaje })
            return
        }

        // Elegir ítem aleatorio (no puede ser de bodega)
        const itemRobado = itemsVictima[Math.floor(Math.random() * itemsVictima.length)]

        // Quitar de la víctima
        if (itemRobado.cantidad <= 1) {
            await db.execute('DELETE FROM inventario_usuario WHERE jid = ? AND item = ?', [mencionado, itemRobado.item])
        } else {
            await db.execute('UPDATE inventario_usuario SET cantidad = cantidad - 1 WHERE jid = ? AND item = ?', [mencionado, itemRobado.item])
        }

        // Dar al robador
        const [yaExiste] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?', [userJid, itemRobado.item]
        )
        if (yaExiste.length > 0) {
            await db.execute('UPDATE inventario_usuario SET cantidad = cantidad + 1 WHERE jid = ? AND item = ?', [userJid, itemRobado.item])
        } else {
            await db.execute('INSERT INTO inventario_usuario (jid, item, cantidad) VALUES (?, ?, 1)', [userJid, itemRobado.item])
        }

        await sock.sendMessage(jid, {
            text: `🦹 *¡ROBO DE ÍTEM EXITOSO!*\n\nLe robaste *${itemRobado.item}* a @${mencionado.split('@')[0]}.\n\n💡 Usa *.inventario* para verlo.`,
            mentions: [mencionado]
        }, { quoted: mensaje })
    }
}

export default robar_item
