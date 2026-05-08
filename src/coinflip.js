import db from './db.js'
import { cobrarImpuesto, verificarCooldown, registrarCooldown } from './utils.js'

const coinflip = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.coinflip <cantidad>*` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'coinflip', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if ((rows[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero.\n\n💵 *Tu balance:* ${rows[0].monedas || 0} monedas` }, { quoted: mensaje })
            return
        }

        const resultado = Math.random() < 0.5
        const impuesto = await cobrarImpuesto(userJid, rows[0].monedas)

        if (resultado) {
            await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cantidad, userJid])
        } else {
            await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cantidad, userJid])
        }
        await registrarCooldown(userJid, 'coinflip', 15)

        await sock.sendMessage(jid, {
            text: `🪙 *COIN FLIP*\n\n${resultado ? `🟡 *¡CARA!* Ganaste *${cantidad} monedas*!` : `⚫ *¡SELLO!* Perdiste *${cantidad} monedas*.`}\n💸 *Impuesto (0.5%):* -${impuesto} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + (resultado ? cantidad : -cantidad) - impuesto} monedas`
        }, { quoted: mensaje })
    }
}

export default coinflip
