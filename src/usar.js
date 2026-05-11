import db from './db.js'
import { darXP } from './utils.js'

const usar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.usar <item>*` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()

        const [rows] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?',
            [userJid, itemKey]
        )

        if (rows.length === 0 || rows[0].cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes *${itemKey}* en tu inventario.` }, { quoted: mensaje })
            return
        }

        let respuesta = ''

        switch (itemKey) {
            case 'cristal_xp': {
                await darXP(userJid, 50)
                respuesta = `✨ *Cristal de XP usado!*\n\nGanaste *+50 XP*.`
                break
            }
            case 'moneda_dorada': {
                await db.execute('UPDATE usuarios SET monedas = monedas + 2000 WHERE jid = ?', [userJid])
                respuesta = `💰 *Moneda Dorada usada!*\n\nRecibiste *+2000 monedas*.`
                break
            }
            case 'pocion_vida': {
                await db.execute('UPDATE usuarios SET monedas = monedas + 500 WHERE jid = ?', [userJid])
                respuesta = `🧪 *Poción de Vida usada!*\n\nRecuperaste energía y recibiste *+500 monedas*.`
                break
            }
            case 'caja_premium': {
                const premios = [500, 1000, 2000, 5000, 10000]
                const premio = premios[Math.floor(Math.random() * premios.length)]
                await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [premio, userJid])
                respuesta = `🎁 *Caja Premium abierta!*\n\n¡Encontraste *${premio} monedas*!`
                break
            }
            default: {
                await sock.sendMessage(jid, { text: `❌ Este ítem no se puede usar directamente.\n\n💡 Prueba *.equipar ${itemKey}*` }, { quoted: mensaje })
                return
            }
        }

        // Reducir cantidad
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
