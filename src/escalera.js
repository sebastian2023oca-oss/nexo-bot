import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const ESCALONES = 5
const PROB_AVANZAR = 0.6
const MULTIPLICADOR_POR_ESCALON = 0.8

const escalera = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.escalera <cantidad>*` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'escalera', 15)
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

        // Simula la escalera completa: en cada escalón, probabilidad de avanzar o caer
        let escalon = 0
        let detalle = ''
        for (let i = 1; i <= ESCALONES; i++) {
            if (Math.random() < PROB_AVANZAR) {
                escalon = i
                detalle += `🟩 Escalón ${i}: superado\n`
            } else {
                detalle += `🟥 Escalón ${i}: ¡resbalaste!\n`
                break
            }
        }

        const multiplicador = 1 + (escalon * MULTIPLICADOR_POR_ESCALON)
        const premio = escalon > 0 ? Math.floor(cantidad * multiplicador) : 0
        const ganancia = premio - cantidad

        await db.execute('UPDATE usuarios SET monedas = monedas - ? + ? WHERE jid = ?', [cantidad, premio, userJid])
        await registrarCooldown(userJid, 'escalera', 15)
        await registrarJugadaCasino(userJid, 'escalera', cantidad, ganancia >= 0 ? 'gano' : 'perdio', ganancia)

        await sock.sendMessage(jid, {
            text: `🪜 *ESCALERA DE LA SUERTE*\n\n${detalle}\n${escalon === ESCALONES ? '🏆 *¡LLEGASTE A LA CIMA!*\n' : escalon > 0 ? `🎯 *Llegaste al escalón ${escalon}/${ESCALONES}*\n` : '💀 *Te caíste en el primer escalón.*\n'}\n💰 *Apostado:* ${cantidad} monedas\n🎁 *Obtenido:* ${premio} monedas\n${ganancia >= 0 ? '📈' : '📉'} *Resultado:* ${ganancia >= 0 ? '+' : ''}${ganancia} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - cantidad + premio} monedas`
        }, { quoted: mensaje })
    }
}

export default escalera
