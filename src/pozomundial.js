import db from './db.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const PROB_GANAR = 0.015
const APORTE_AL_POZO = 0.8

const pozomundial = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            const [pozoRows] = await db.execute('SELECT pozo FROM casino_pozo_mundial WHERE id = 1')
            await sock.sendMessage(jid, {
                text: `🌍 *POZO MUNDIAL*\n\n💰 *Pozo acumulado entre TODOS los grupos:* ${(pozoRows[0]?.pozo || 0).toLocaleString()} monedas\n\n📌 Uso: *.pozomundial <cantidad>*\n\n💡 Cada apuesta aquí suma al pozo compartido entre todos los grupos donde está Nexo-Bot.`
            }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
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

        const [pozoRows] = await db.execute('SELECT pozo FROM casino_pozo_mundial WHERE id = 1')
        const pozoActual = pozoRows[0]?.pozo || 0

        const gano = Math.random() < PROB_GANAR

        if (gano && pozoActual > 0) {
            await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [pozoActual, userJid])
            await db.execute('UPDATE casino_pozo_mundial SET pozo = 0 WHERE id = 1')
            await registrarJugadaCasino(userJid, 'pozomundial', cantidad, 'gano', pozoActual)

            await sock.sendMessage(jid, {
                text: `🌍🎉 *¡¡¡POZO MUNDIAL GANADO!!!* 🎉🌍\n\n🏆 *@${userJid.split('@')[0]} se llevó el pozo de TODOS los grupos:*\n💰 *${pozoActual.toLocaleString()} monedas*\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + pozoActual} monedas`,
                mentions: [userJid]
            }, { quoted: mensaje })
            return
        }

        const aporte = Math.floor(cantidad * APORTE_AL_POZO)
        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cantidad, userJid])
        await db.execute('UPDATE casino_pozo_mundial SET pozo = pozo + ? WHERE id = 1', [aporte])
        await registrarJugadaCasino(userJid, 'pozomundial', cantidad, 'perdio', -cantidad)

        await sock.sendMessage(jid, {
            text: `🌍 *POZO MUNDIAL*\n\n❌ *No ganaste el pozo mundial esta vez.*\n\n💸 *Apostado:* ${cantidad} monedas\n📥 *Se sumaron al pozo global:* ${aporte.toLocaleString()} monedas\n💰 *Pozo mundial actual:* ${(pozoActual + aporte).toLocaleString()} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - cantidad} monedas`
        }, { quoted: mensaje })
    }
}

export default pozomundial