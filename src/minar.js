import db from './db.js'
import { cobrarImpuesto, verificarCooldown, registrarCooldown, darXP } from './utils.js'

const minar = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'minar', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para minar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const recursos = ['⛏️ Bitcoin', '💎 Ethereum', '🪙 Litecoin', '🔷 Solana']
        const recurso = recursos[Math.floor(Math.random() * recursos.length)]
        const ganancia = Math.floor(Math.random() * 400) + 100
        const xpGanado = Math.floor(Math.random() * 8) + 3

        const impuesto = await cobrarImpuesto(userJid, rows[0].monedas)
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [ganancia, userJid])
        await registrarCooldown(userJid, 'minar', 15)
        await darXP(userJid, xpGanado)

        await sock.sendMessage(jid, {
            text: `⛏️ *MINERÍA*\n\nMinaste *${recurso}* y obtuviste *${ganancia} monedas*.\n✨ *XP ganado:* +${xpGanado}\n💸 *Impuesto (0.5%):* -${impuesto} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + ganancia - impuesto} monedas`
        }, { quoted: mensaje })
    }
}

export default minar
