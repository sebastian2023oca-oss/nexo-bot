import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'

const mejorar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.mejorar <item>*\n\n💡 Necesitas tener *gema_mejora* en tu inventario.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'mejorar', 20)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para mejorar de nuevo.` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()

        const [invItem] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?',
            [userJid, itemKey]
        )

        if (invItem.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes *${itemKey}* en tu inventario.` }, { quoted: mensaje })
            return
        }

        const [gema] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = "gema_mejora"',
            [userJid]
        )

        if (gema.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Necesitas una *Gema de Mejora* para mejorar ítems.\n\n💡 Cómprala en la *.tienda*` }, { quoted: mensaje })
            return
        }

        // Consumir la gema
        if (gema[0].cantidad <= 1) {
            await db.execute('DELETE FROM inventario_usuario WHERE jid = ? AND item = "gema_mejora"', [userJid])
        } else {
            await db.execute('UPDATE inventario_usuario SET cantidad = cantidad - 1 WHERE jid = ? AND item = "gema_mejora"', [userJid])
        }

        // 70% éxito, 30% fallo
        const exito = Math.random() < 0.7

        await db.execute('INSERT INTO historico_items (jid, accion, item) VALUES (?, "mejorar", ?)', [userJid, itemKey])
        await registrarCooldown(userJid, 'mejorar', 20)

        if (exito) {
            await sock.sendMessage(jid, {
                text: `⬆️ *MEJORA EXITOSA*\n\n✅ *${itemKey}* fue mejorado.\n🔮 Sus stats han aumentado.\n\n💎 Se consumió 1 *Gema de Mejora*.`
            }, { quoted: mensaje })
        } else {
            await sock.sendMessage(jid, {
                text: `❌ *MEJORA FALLIDA*\n\nLa mejora de *${itemKey}* falló esta vez.\n\n💎 Se consumió 1 *Gema de Mejora* de todas formas.`
            }, { quoted: mensaje })
        }
    }
}

export default mejorar
