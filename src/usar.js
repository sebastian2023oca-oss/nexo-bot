import db from './db.js'
import { darXP } from './utils.js'
import { calcularMultiplicadorMejora, obtenerNivelMejora } from './mejorasItems.js'

const usar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.usar <item>*` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()

        const [rows] = await db.execute('SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?', [userJid, itemKey])

        if (rows.length === 0 || rows[0].cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes *${itemKey}* en tu inventario.` }, { quoted: mensaje })
            return
        }

        let respuesta = ''
        const nivelMejora = obtenerNivelMejora(rows[0])
        const multiplicadorMejora = calcularMultiplicadorMejora(itemKey, rows[0])
        const mejoraTexto = nivelMejora > 0 ? `\n🚀 *Mejora aplicada:* +${nivelMejora} | x${multiplicadorMejora.toFixed(2)}` : ''

        switch (itemKey) {
            case 'cristal_xp': {
                const xp = Math.floor(50 * multiplicadorMejora)
                await darXP(userJid, xp)
                respuesta = `✨ *Cristal de XP usado!*\n\nGanaste *+${xp} XP*.${mejoraTexto}`
                break
            }
            case 'moneda_dorada': {
                const monedas = Math.floor(2000 * multiplicadorMejora)
                await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [monedas, userJid])
                respuesta = `💰 *Moneda Dorada usada!*\n\nRecibiste *+${monedas} monedas*.${mejoraTexto}`
                break
            }
            case 'pocion_vida': {
                const monedas = Math.floor(500 * multiplicadorMejora)
                await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [monedas, userJid])
                respuesta = `🧪 *Poción de Vida usada!*\n\nRecuperaste energía y recibiste *+${monedas} monedas*.${mejoraTexto}`
                break
            }
            case 'caja_premium': {
                const premios = [500, 1000, 2000, 5000, 10000]
                const premioBase = premios[Math.floor(Math.random() * premios.length)]
                const premio = Math.floor(premioBase * multiplicadorMejora)
                await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [premio, userJid])
                respuesta = `🎁 *Caja Premium abierta!*\n\n¡Encontraste *${premio} monedas*!${mejoraTexto}`
                break
            }
            case 'ticket_vip_dia': {
                const monedas = Math.floor(5000 * multiplicadorMejora)
                await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [monedas, userJid])
                respuesta = `🎫 *Ticket especial canjeado!*\n\nRecibiste *+${monedas} monedas* a cambio.${mejoraTexto}`
                break
            }
            default: {
                await sock.sendMessage(jid, { text: `❌ Este ítem no se puede usar directamente.\n\n💡 Prueba *.equipar ${itemKey}*` }, { quoted: mensaje })
                return
            }
        }

        if (rows[0].cantidad <= 1) {
            await db.execute('DELETE FROM inventario_usuario WHERE jid = ? AND item = ?', [userJid, itemKey])
        } else {
            await db.execute('UPDATE inventario_usuario SET cantidad = cantidad - 1 WHERE jid = ? AND item = ?', [userJid, itemKey])
        }

        await db.execute('INSERT INTO historico_items (jid, accion, item, cantidad) VALUES (?, "usar", ?, 1)', [userJid, itemKey])

        await sock.sendMessage(jid, { text: respuesta }, { quoted: mensaje })
    }
}

export default usar