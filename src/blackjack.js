import db from './db.js'
import { cobrarImpuesto, verificarCooldown, registrarCooldown } from './utils.js'

function carta() {
    const cartas = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    return cartas[Math.floor(Math.random() * cartas.length)]
}

function valor(c) {
    if (['J', 'Q', 'K'].includes(c)) return 10
    if (c === 'A') return 11
    return parseInt(c)
}

function suma(mano) {
    let total = mano.reduce((a, c) => a + valor(c), 0)
    let ases = mano.filter(c => c === 'A').length
    while (total > 21 && ases > 0) { total -= 10; ases-- }
    return total
}

const blackjack = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.blackjack <cantidad>*` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'blackjack', 15)
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

        const manoJugador = [carta(), carta()]
        const manoDealer = [carta(), carta()]

        while (suma(manoDealer) < 17) manoDealer.push(carta())

        const puntajeJ = suma(manoJugador)
        const puntajeD = suma(manoDealer)

        let resultado = ''
        let ganancia = 0

        if (puntajeJ > 21) {
            resultado = '💥 *Te pasaste de 21. Perdiste.*'
            ganancia = -cantidad
        } else if (puntajeD > 21 || puntajeJ > puntajeD) {
            resultado = '✅ *¡Ganaste!*'
            ganancia = cantidad
        } else if (puntajeJ === puntajeD) {
            resultado = '🤝 *Empate. Recuperas tu apuesta.*'
            ganancia = 0
        } else {
            resultado = '❌ *El dealer ganó.*'
            ganancia = -cantidad
        }

        const impuesto = await cobrarImpuesto(userJid, rows[0].monedas)
        if (ganancia !== 0) {
            await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [ganancia, userJid])
        }
        await registrarCooldown(userJid, 'blackjack', 15)

        await sock.sendMessage(jid, {
            text: `🃏 *BLACKJACK*\n\n🧑 *Tu mano:* ${manoJugador.join(' ')} = *${puntajeJ}*\n🤖 *Dealer:* ${manoDealer.join(' ')} = *${puntajeD}*\n\n${resultado}\n${ganancia !== 0 ? `💰 *${ganancia > 0 ? 'Ganaste' : 'Perdiste'}:* ${Math.abs(ganancia)} monedas` : ''}\n💸 *Impuesto (0.5%):* -${impuesto} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + ganancia - impuesto} monedas`
        }, { quoted: mensaje })
    }
}

export default blackjack
