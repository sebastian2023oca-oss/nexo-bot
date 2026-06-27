import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'

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

// Genera una mano de jugador y de dealer cuyo resultado coincide con
// el desenlace decidido (gano/empate/perdio), sin alterar la mecánica
// visual de "cartas" que ve el usuario.
function generarManos(desenlace) {
    let intentos = 0
    while (intentos < 200) {
        intentos++
        const manoJugador = [carta(), carta()]
        const manoDealer = [carta(), carta()]
        while (suma(manoDealer) < 17) manoDealer.push(carta())

        const puntajeJ = suma(manoJugador)
        const puntajeD = suma(manoDealer)

        let resultadoReal
        if (puntajeJ > 21) resultadoReal = 'perdio'
        else if (puntajeD > 21 || puntajeJ > puntajeD) resultadoReal = 'gano'
        else if (puntajeJ === puntajeD) resultadoReal = 'empate'
        else resultadoReal = 'perdio'

        if (resultadoReal === desenlace) {
            return { manoJugador, manoDealer, puntajeJ, puntajeD }
        }
    }
    // Fallback de seguridad (no debería alcanzarse en la práctica)
    return { manoJugador: ['10', '7'], manoDealer: ['10', '9'], puntajeJ: 17, puntajeD: 19 }
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

        // 30% gana, 70% pierde (sin empates artificiales para mantener
        // el house edge limpio en 30/70)
        const desenlace = Math.random() < 0.3 ? 'gano' : 'perdio'
        const { manoJugador, manoDealer, puntajeJ, puntajeD } = generarManos(desenlace)

        let resultado = ''
        let ganancia = 0

        if (desenlace === 'gano') {
            resultado = puntajeD > 21 ? '✅ *¡El dealer se pasó! Ganaste!*' : '✅ *¡Ganaste!*'
            ganancia = cantidad
        } else {
            resultado = puntajeJ > 21 ? '💥 *Te pasaste de 21. Perdiste.*' : '❌ *El dealer ganó.*'
            ganancia = -cantidad
        }

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [ganancia, userJid])
        await registrarCooldown(userJid, 'blackjack', 15)

        await sock.sendMessage(jid, {
            text: `🃏 *BLACKJACK*\n\n🧑 *Tu mano:* ${manoJugador.join(' ')} = *${puntajeJ}*\n🤖 *Dealer:* ${manoDealer.join(' ')} = *${puntajeD}*\n\n${resultado}\n💰 *${ganancia > 0 ? 'Ganaste' : 'Perdiste'}:* ${Math.abs(ganancia)} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + ganancia} monedas`
        }, { quoted: mensaje })
    }
}

export default blackjack