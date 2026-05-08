import db from './db.js'
import { cobrarImpuesto, darXP } from './utils.js'

const RECOMPENSA_DAILY = 500

const daily = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        const [eco] = await db.execute('SELECT * FROM economia WHERE jid = ?', [userJid])

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if (eco.length > 0 && eco[0].last_daily) {
            const diff = Date.now() - new Date(eco[0].last_daily).getTime()
            const restante = 86400000 - diff
            if (restante > 0) {
                const hrs = Math.floor(restante / 3600000)
                const min = Math.floor((restante % 3600000) / 60000)
                await sock.sendMessage(jid, { text: `⏳ Ya reclamaste tu recompensa hoy.\n\n⌛ Vuelve en *${hrs}h ${min}m*` }, { quoted: mensaje })
                return
            }
        }

        const impuesto = await cobrarImpuesto(userJid, rows[0].monedas)
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [RECOMPENSA_DAILY, userJid])
        if (eco.length === 0) {
            await db.execute('INSERT INTO economia (jid, last_daily) VALUES (?, NOW())', [userJid])
        } else {
            await db.execute('UPDATE economia SET last_daily = NOW() WHERE jid = ?', [userJid])
        }
        await darXP(userJid, 20)

        await sock.sendMessage(jid, {
            text: `🎁 *RECOMPENSA DIARIA*\n\n✅ Recibiste *${RECOMPENSA_DAILY} monedas*.\n✨ *XP ganado:* +20\n💸 *Impuesto (0.5%):* -${impuesto} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + RECOMPENSA_DAILY - impuesto} monedas\n\n⌛ Vuelve mañana para reclamar de nuevo.`
        }, { quoted: mensaje })
    }
}

export default daily