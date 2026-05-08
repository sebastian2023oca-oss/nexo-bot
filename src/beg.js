import db from './db.js'
import { cobrarImpuesto, verificarCooldown, registrarCooldown, darXP } from './utils.js'

const beg = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'beg', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para pedir de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const exito = Math.random() < 0.6
        const ganancia = exito ? Math.floor(Math.random() * 50) + 10 : 0

        const impuesto = await cobrarImpuesto(userJid, rows[0].monedas)
        if (exito) {
            await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [ganancia, userJid])
        }
        await registrarCooldown(userJid, 'beg', 15)
        await darXP(userJid, 1)

        await sock.sendMessage(jid, {
            text: exito
                ? `🙏 *MENDICIDAD*\n\nAlguien tuvo compasión y te dio *${ganancia} monedas*.\n✨ *XP ganado:* +1\n💸 *Impuesto (0.1%):* -${impuesto} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + ganancia - impuesto} monedas`
                : `🙏 *MENDICIDAD*\n\nNadie te hizo caso esta vez... 😔\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - impuesto} monedas`
        }, { quoted: mensaje })
    }
}

export default beg
