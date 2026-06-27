import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const MAX_RONDAS = 6

const sobrevive = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.sobrevive <cantidad>*` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'sobrevive', 15)
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

        // Un solo check de 30/70: si gana, sobrevive TODAS las rondas;
        // si pierde, cae de inmediato en la primera ronda.
        const gana = Math.random() < 0.3
        const rondasSobrevividas = gana ? MAX_RONDAS : 0

        let detalle = ''
        if (gana) {
            for (let i = 1; i <= MAX_RONDAS; i++) detalle += `🟢 Ronda ${i}: sobreviviste\n`
        } else {
            detalle += `🔴 Ronda 1: caíste\n`
        }

        const multiplicador = rondasSobrevividas === 0 ? 0 : Math.pow(1.45, rondasSobrevividas)
        const premio = Math.floor(cantidad * multiplicador)
        const ganancia = premio - cantidad

        await db.execute('UPDATE usuarios SET monedas = monedas - ? + ? WHERE jid = ?', [cantidad, premio, userJid])
        await registrarCooldown(userJid, 'sobrevive', 15)
        await registrarJugadaCasino(userJid, 'sobrevive', cantidad, ganancia >= 0 ? 'gano' : 'perdio', ganancia)

        await sock.sendMessage(jid, {
            text: `🏕️ *SOBREVIVE*\n\n${detalle}\n${rondasSobrevividas === MAX_RONDAS ? '🏆 *¡SOBREVIVISTE TODAS LAS RONDAS!*\n' : `💀 *Caíste en la ronda 1*\n`}\n💰 *Apostado:* ${cantidad} monedas\n🎁 *Obtenido:* ${premio} monedas\n${ganancia >= 0 ? '📈' : '📉'} *Resultado:* ${ganancia >= 0 ? '+' : ''}${ganancia} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - cantidad + premio} monedas`
        }, { quoted: mensaje })
    }
}

export default sobrevive