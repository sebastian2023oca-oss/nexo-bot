import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const frases = [
    'el cielo es azul', 'hola mundo desde el bot', 'velocidad maxima',
    'jugando con el bot', 'nexo bot es epico', 'teclea rapido ahora',
    'la vida es bella', 'coding es divertido', 'aprendiendo cada dia',
    'el tiempo vuela rapido', 'juega y gana monedas', 'sigue intentando siempre',
]

const sesionesActivas = new Map()

const speedtype = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'speedtype', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        if (sesionesActivas.has(userJid)) {
            await sock.sendMessage(jid, { text: `⚠️ Ya tienes una partida activa.` }, { quoted: mensaje })
            return
        }

        const frase = frases[Math.floor(Math.random() * frases.length)]
        const inicio = Date.now()
        sesionesActivas.set(userJid, true)
        await registrarCooldown(userJid, 'speedtype', 3)

        await sock.sendMessage(jid, {
            text: `⌨️ *VELOCIDAD DE ESCRITURA*\n\nEscribe exactamente:\n\n*"${frase}"*\n\nTienes *15 segundos*. ¡Ya!`
        }, { quoted: mensaje })

        let respondio = false

        const timeout = setTimeout(async () => {
            if (!respondio) {
                respondio = true
                sesionesActivas.delete(userJid)
                await sock.sendMessage(jid, { text: `⏰ *¡Tiempo agotado!*\n\nLa frase era: *"${frase}"*` }, { quoted: mensaje })
            }
        }, 15000)

        const listener = async ({ messages }) => {
            if (respondio) return
            for (const m of messages) {
                if (respondio) break
                const autor = m.key.participant || m.key.remoteJid
                if (autor !== userJid || m.key.remoteJid !== jid) continue
                const texto = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim().toLowerCase()
                if (!texto) continue

                respondio = true
                clearTimeout(timeout)
                sesionesActivas.delete(userJid)
                sock.ev.off('messages.upsert', listener)

                const tiempo = (Date.now() - inicio) / 1000

                if (texto === frase && tiempo <= 15) {
                    const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
                    await darRecompensaJuego(userJid, 6, 20)
                    await intentarDarEstrella(userJid, sock, jid, mensaje)
                    await sock.sendMessage(jid, {
                        text: `✅ *¡CORRECTO!*\n\n⏱️ Tiempo: *${tiempo.toFixed(2)}s*\n✨ *+6 XP* | 💰 *+20 monedas*\n🏆 *Victorias totales:* ${victorias}`
                    }, { quoted: m })
                } else {
                    await sock.sendMessage(jid, {
                        text: `❌ *Texto incorrecto.*\n\nLa frase era: *"${frase}"*`
                    }, { quoted: m })
                }
            }
        }

        sock.ev.on('messages.upsert', listener)
    }
}

export default speedtype