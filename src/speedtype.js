import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const frases = [
    'el cielo es azul', 'hola mundo desde el bot', 'velocidad maxima',
    'jugando con el bot', 'nexo bot es epico', 'teclea rapido ahora',
    'la vida es bella', 'coding es divertido', 'aprendiendo cada dia',
    'el tiempo vuela rapido', 'juega y gana monedas', 'sigue intentando siempre',
]

const speedtype = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'speedtype', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        const frase = frases[Math.floor(Math.random() * frases.length)]
        const inicio = Date.now()

        await sock.sendMessage(jid, {
            text: `⌨️ *VELOCIDAD DE ESCRITURA*\n\nEscribe exactamente esto en *15 segundos*:\n\n*"${frase}"*\n\n¡Ya!`
        }, { quoted: mensaje })

        await registrarCooldown(userJid, 'speedtype', 3)

        const escuchar = sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const m of messages) {
                const autor = m.key.participant || m.key.remoteJid
                const texto = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim().toLowerCase()

                if (autor !== userJid || m.key.remoteJid !== jid) continue

                const tiempo = (Date.now() - inicio) / 1000
                escuchar()
                clearTimeout(timeout)

                if (texto === frase && tiempo <= 15) {
                    const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
                    await darRecompensaJuego(userJid, 6, 20)
                    await intentarDarEstrella(userJid, sock, jid, mensaje)
                    await sock.sendMessage(jid, {
                        text: `✅ *¡CORRECTO!*\n\n⏱️ Tiempo: *${tiempo.toFixed(2)}s*\n✨ *+6 XP* | 💰 *+20 monedas*\n🏆 *Victorias totales:* ${victorias}`
                    }, { quoted: m })
                } else if (tiempo > 15) {
                    await sock.sendMessage(jid, {
                        text: `⏰ *¡Muy lento!* (${tiempo.toFixed(2)}s)\n\nLa frase era: *"${frase}"*`
                    }, { quoted: m })
                } else {
                    await sock.sendMessage(jid, {
                        text: `❌ *Texto incorrecto.*\n\nLa frase era: *"${frase}"*`
                    }, { quoted: m })
                }
            }
        })

        const timeout = setTimeout(async () => {
            escuchar()
            await sock.sendMessage(jid, {
                text: `⏰ *¡Tiempo agotado!*\n\nLa frase era: *"${frase}"*`
            }, { quoted: mensaje })
        }, 15000)
    }
}

export default speedtype
