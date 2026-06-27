import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const simbolos = ['🍒', '🍋', '🔔', '⭐', '💎']

// Genera una tarjeta de 9 casillas que NO tiene ninguna combinación de 3+
function generarTarjetaSinCombinacion() {
    let casillas
    do {
        casillas = []
        for (let i = 0; i < 9; i++) {
            casillas.push(simbolos[Math.floor(Math.random() * simbolos.length)])
        }
    } while (calcularPremio(casillas) > 0)
    return casillas
}

// Genera una tarjeta de 9 casillas que SÍ tiene una combinación ganadora
function generarTarjetaConCombinacion() {
    const casillas = new Array(9).fill(null)
    const simboloGanador = simbolos[Math.floor(Math.random() * simbolos.length)]

    // Elegir cuántas veces aparece el símbolo ganador (3, 4 o 5) con pesos
    const opciones = [3, 4, 5]
    const pesos = [60, 30, 10]
    const total = pesos.reduce((a, b) => a + b, 0)
    let rand = Math.random() * total
    let repeticiones = 3
    for (let i = 0; i < pesos.length; i++) {
        if (rand < pesos[i]) { repeticiones = opciones[i]; break }
        rand -= pesos[i]
    }

    const indices = [...Array(9).keys()].sort(() => Math.random() - 0.5).slice(0, repeticiones)
    for (const idx of indices) casillas[idx] = simboloGanador

    for (let i = 0; i < 9; i++) {
        if (casillas[i] === null) {
            let otro
            do { otro = simbolos[Math.floor(Math.random() * simbolos.length)] } while (otro === simboloGanador)
            casillas[i] = otro
        }
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

        // 30% de probabilidad de obtener una combinación ganadora
        const gana = Math.random() < 0.3
        const casillas = gana ? generarTarjetaConCombinacion() : generarTarjetaSinCombinacion()
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