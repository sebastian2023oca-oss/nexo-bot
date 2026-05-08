import db from './db.js'
import { cobrarImpuesto, verificarCooldown, registrarCooldown, darXP } from './utils.js'

const repartir = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'repartir', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para repartir de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const entregas = [
            '📦 Entregaste un paquete en tiempo récord',
            '🍕 Repartiste 5 pizzas sin que se enfriaran',
            '💊 Llevaste medicinas a domicilio',
            '🛒 Hiciste una entrega de supermercado',
        ]
        const entrega = entregas[Math.floor(Math.random() * entregas.length)]
        const ganancia = Math.floor(Math.random() * 200) + 80
        const xpGanado = Math.floor(Math.random() * 6) + 2

        const impuesto = await cobrarImpuesto(userJid, rows[0].monedas)
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [ganancia, userJid])
        await registrarCooldown(userJid, 'repartir', 15)
        await darXP(userJid, xpGanado)

        await sock.sendMessage(jid, {
            text: `🚴 *REPARTO*\n\n${entrega} y ganaste *${ganancia} monedas*.\n✨ *XP ganado:* +${xpGanado}\n💸 *Impuesto (0.1%):* -${impuesto} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + ganancia - impuesto} monedas`
        }, { quoted: mensaje })
    }
}

export default repartir
