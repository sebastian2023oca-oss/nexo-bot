import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

function generarOperacion() {
    const ops = ['+', '-', '*']
    const op = ops[Math.floor(Math.random() * ops.length)]
    let a, b, resultado
    if (op === '+') { a = Math.floor(Math.random() * 200) + 1; b = Math.floor(Math.random() * 200) + 1; resultado = a + b }
    else if (op === '-') { a = Math.floor(Math.random() * 200) + 50; b = Math.floor(Math.random() * (a - 1)) + 1; resultado = a - b }
    else { a = Math.floor(Math.random() * 20) + 2; b = Math.floor(Math.random() * 20) + 2; resultado = a * b }
    return { pregunta: `${a} ${op} ${b}`, resultado: String(resultado) }
}

const sesionesActivas = new Map()

const mathgame = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'mathgame', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        if (sesionesActivas.has(userJid)) {
            await sock.sendMessage(jid, { text: `⚠️ Ya tienes una partida activa.` }, { quoted: mensaje })
            return
        }

        const { pregunta, resultado } = generarOperacion()
        sesionesActivas.set(userJid, true)
        await registrarCooldown(userJid, 'mathgame', 3)

        await sock.sendMessage(jid, {
            text: `🧮 *RETO MATEMÁTICO*\n\n¿Cuánto es: *${pregunta}*?\n\nResponde con el número. Tienes *20 segundos*.`
        }, { quoted: mensaje })

        let respondio = false

        const timeout = setTimeout(async () => {
            if (!respondio) {
                respondio = true
                sesionesActivas.delete(userJid)
                await sock.sendMessage(jid, { text: `⏰ *¡Tiempo agotado!*\n\nLa respuesta era: *${resultado}*` }, { quoted: mensaje })
            }
        }, 20000)

        const listener = async ({ messages }) => {
            if (respondio) return
            for (const m of messages) {
                if (respondio) break
                const autor = m.key.participant || m.key.remoteJid
                if (autor !== userJid || m.key.remoteJid !== jid) continue
                const texto = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim()
                if (texto !== resultado) continue

                respondio = true
                clearTimeout(timeout)
                sesionesActivas.delete(userJid)
                sock.ev.off('messages.upsert', listener)
                const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
                await darRecompensaJuego(userJid, 5, 15)
                await intentarDarEstrella(userJid, sock, jid, mensaje)
                await sock.sendMessage(jid, {
                    text: `✅ *¡CORRECTO!*\n\n🎯 *${pregunta} = ${resultado}*\n✨ *+5 XP* | 💰 *+15 monedas*\n🏆 *Victorias totales:* ${victorias}`
                }, { quoted: m })
            }
        }

        sock.ev.on('messages.upsert', listener)
    }
}

export default mathgame