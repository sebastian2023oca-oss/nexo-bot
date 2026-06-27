import db from './db.js'
import { registrarJugadaCasino } from './casinoUtils.js'

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

// Genera dos manos cuyo desenlace coincide con quién debe ganar
// ('j1' o 'j2'), manteniendo la presentación visual de cartas.
function generarManosVs(ganador) {
    let intentos = 0
    while (intentos < 200) {
        intentos++
        const mano1 = [carta(), carta()]
        const mano2 = [carta(), carta()]
        while (suma(mano1) < 17) mano1.push(carta())
        while (suma(mano2) < 17) mano2.push(carta())

        const p1 = suma(mano1)
        const p2 = suma(mano2)

        let resultadoReal
        if (p1 > 21 && p2 > 21) resultadoReal = 'empate'
        else if (p1 > 21) resultadoReal = 'j2'
        else if (p2 > 21) resultadoReal = 'j1'
        else if (p1 === p2) resultadoReal = 'empate'
        else resultadoReal = p1 > p2 ? 'j1' : 'j2'

        if (resultadoReal === ganador) {
            return { mano1, mano2, p1, p2 }
        }
    }
    return { mano1: ['10', '8'], mano2: ['10', '6'], p1: 18, p2: 16 }
}

const blackjackvs = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado || !args[args.length - 1]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.blackjackvs @usuario <cantidad>*` }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes jugar contra ti mismo.` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[args.length - 1])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [j1] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        const [j2] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])

        if (j1.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
        if (j2.length === 0) { await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado.` }, { quoted: mensaje }); return }

        if ((j1[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero.` }, { quoted: mensaje })
            return
        }
        if ((j2[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ @${mencionado.split('@')[0]} no tiene suficiente dinero.`, mentions: [mencionado] }, { quoted: mensaje })
            return
        }

        // Retador (userJid = j1) gana 30% de las veces
        const desenlace = Math.random() < 0.3 ? 'j1' : 'j2'
        const { mano1, mano2, p1, p2 } = generarManosVs(desenlace)

        const ganador = desenlace === 'j1' ? userJid : mencionado
        const perdedor = desenlace === 'j1' ? mencionado : userJid

        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cantidad, perdedor])
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cantidad, ganador])
        await registrarJugadaCasino(ganador, 'blackjackvs', cantidad, 'gano', cantidad)
        await registrarJugadaCasino(perdedor, 'blackjackvs', cantidad, 'perdio', -cantidad)

        await sock.sendMessage(jid, {
            text: `🃏 *BLACKJACK VS*\n\n@${userJid.split('@')[0]}: ${mano1.join(' ')} = ${p1}\n@${mencionado.split('@')[0]}: ${mano2.join(' ')} = ${p2}\n\n💰 *Apuesta:* ${cantidad} monedas\n🏆 *Ganador:* @${ganador.split('@')[0]} (+${cantidad})\n💀 *Perdedor:* @${perdedor.split('@')[0]} (-${cantidad})`,
            mentions: [userJid, mencionado]
        }, { quoted: mensaje })
    }
}

export default blackjackvs