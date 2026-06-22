import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const PROB_GANAR_JACKPOT = 0.02
const APORTE_AL_POZO = 0.7

const jackpot = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            const [pozoRows] = await db.execute('SELECT pozo FROM casino_jackpot WHERE id = 1')
            await sock.sendMessage(jid, {
                text: `🎰 *JACKPOT GLOBAL*\n\n💰 *Pozo actual:* ${(pozoRows[0]?.pozo || 0).toLocaleString()} monedas\n\n📌 Uso: *.jackpot <cantidad>*\n\n💡 Cada apuesta tiene 2% de probabilidad de ganar TODO el pozo.\n💡 El 70% de lo que pierdas se suma al pozo global.`
            }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'jackpot', 10)
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

        const [pozoRows] = await db.execute('SELECT pozo FROM casino_jackpot WHERE id = 1')
        const pozoActual = pozoRows[0]?.pozo || 0

        const gano = Math.random() < PROB_GANAR_JACKPOT

        await registrarCooldown(userJid, 'jackpot', 10)

        if (gano && pozoActual > 0) {
            await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [pozoActual, userJid])
            await db.execute('UPDATE casino_jackpot SET pozo = 0 WHERE id = 1')
            await registrarJugadaCasino(userJid, 'jackpot', cantidad, 'gano', pozoActual)

            await sock.sendMessage(jid, {
                text: `🎰🎉 *¡¡¡JACKPOT GANADO!!!* 🎉🎰\n\n🏆 *@${userJid.split('@')[0]} se llevó TODO EL POZO:*\n💰 *${pozoActual.toLocaleString()} monedas*\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + pozoActual} monedas\n\n🔄 El pozo se reinició a 0.`,
                mentions: [userJid]
            }, { quoted: mensaje })
            return
        }

        const aporte = Math.floor(cantidad * APORTE_AL_POZO)
        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cantidad, userJid])
        await db.execute('UPDATE casino_jackpot SET pozo = pozo + ? WHERE id = 1', [aporte])
        await registrarJugadaCasino(userJid, 'jackpot', cantidad, 'perdio', -cantidad)

        await sock.sendMessage(jid, {
            text: `🎰 *JACKPOT GLOBAL*\n\n❌ *No ganaste el jackpot esta vez.*\n\n💸 *Apostado:* ${cantidad} monedas\n📥 *Se sumaron al pozo:* ${aporte.toLocaleString()} monedas\n💰 *Pozo actual:* ${(pozoActual + aporte).toLocaleString()} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - cantidad} monedas`
        }, { quoted: mensaje })
    }
}

export default jackpot
