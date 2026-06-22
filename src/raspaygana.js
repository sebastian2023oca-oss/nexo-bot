import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const simbolos = ['🍒', '🍋', '🔔', '⭐', '💎']

function generarTarjeta() {
    const casillas = []
    for (let i = 0; i < 9; i++) {
        casillas.push(simbolos[Math.floor(Math.random() * simbolos.length)])
    }
    return casillas
}

function calcularPremio(casillas) {
    const conteo = {}
    for (const s of casillas) conteo[s] = (conteo[s] || 0) + 1
    const max = Math.max(...Object.values(conteo))

    if (max >= 5) return 4
    if (max === 4) return 2
    if (max === 3) return 1
    return 0
}

const raspaygana = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.raspaygana <cantidad>*` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'raspaygana', 10)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para raspar otra tarjeta.` }, { quoted: mensaje })
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

        const casillas = generarTarjeta()
        const multiplicador = calcularPremio(casillas)
        const premio = Math.floor(cantidad * multiplicador)
        const ganancia = premio - cantidad

        await db.execute('UPDATE usuarios SET monedas = monedas - ? + ? WHERE jid = ?', [cantidad, premio, userJid])
        await registrarCooldown(userJid, 'raspaygana', 10)
        await registrarJugadaCasino(userJid, 'raspaygana', cantidad, ganancia >= 0 ? 'gano' : 'perdio', ganancia)

        const fila1 = casillas.slice(0, 3).join(' ')
        const fila2 = casillas.slice(3, 6).join(' ')
        const fila3 = casillas.slice(6, 9).join(' ')

        await sock.sendMessage(jid, {
            text: `🎫 *RASPA Y GANA*\n\n┌───────┐\n│ ${fila1} │\n│ ${fila2} │\n│ ${fila3} │\n└───────┘\n\n${multiplicador > 0 ? `✅ *¡Combinación encontrada!* x${multiplicador}` : '❌ *Sin combinación. No hubo premio.*'}\n\n💰 *Apostado:* ${cantidad} monedas\n🎁 *Obtenido:* ${premio} monedas\n${ganancia >= 0 ? '📈' : '📉'} *Resultado:* ${ganancia >= 0 ? '+' : ''}${ganancia} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - cantidad + premio} monedas`
        }, { quoted: mensaje })
    }
}

export default raspaygana
