import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

function generarOperacion() {
    const ops = ['+', '-', '*']
    const op = ops[Math.floor(Math.random() * ops.length)]
    let a, b, resultado

    if (op === '+') {
        a = Math.floor(Math.random() * 200) + 1
        b = Math.floor(Math.random() * 200) + 1
        resultado = a + b
    } else if (op === '-') {
        a = Math.floor(Math.random() * 200) + 50
        b = Math.floor(Math.random() * (a - 1)) + 1
        resultado = a - b
    } else {
        a = Math.floor(Math.random() * 20) + 2
        b = Math.floor(Math.random() * 20) + 2
        resultado = a * b
    }

    return { pregunta: `${a} ${op} ${b}`, resultado: String(resultado) }
}

const mathgame = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'mathgame', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        const { pregunta, resultado } = generarOperacion()

        await sock.sendMessage(jid, {
            text: `🧮 *RETO MATEMÁTICO*\n\n¿Cuánto es: *${pregunta}*?\n\nResponde en el chat. Tienes *20 segundos*.`
        }, { quoted: mensaje })

        await registrarCooldown(userJid, 'mathgame', 3)

        const escuchar = sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const m of messages) {
                const autor = m.key.participant || m.key.remoteJid
                const texto = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim()
                if (autor === userJid && m.key.remoteJid === jid && texto === resultado) {
                    escuchar()
                    clearTimeout(timeout)
                    const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
                    await darRecompensaJuego(userJid, 5, 15)
                    await intentarDarEstrella(userJid, sock, jid, mensaje)
                    await sock.sendMessage(jid, {
                        text: `✅ *¡CORRECTO!*\n\n🎯 *${pregunta} = ${resultado}*\n✨ *+5 XP* | 💰 *+15 monedas*\n🏆 *Victorias totales:* ${victorias}`
                    }, { quoted: m })
                }
            }
        })

        const timeout = setTimeout(async () => {
            escuchar()
            await sock.sendMessage(jid, {
                text: `⏰ *¡Tiempo agotado!*\n\nLa respuesta era: *${resultado}*`
            }, { quoted: mensaje })
        }, 20000)
    }
}

export default mathgame
