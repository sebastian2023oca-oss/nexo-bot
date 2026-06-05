import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const sesionesActivas = new Map()

const adivinanumero = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'adivinanumero', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        if (sesionesActivas.has(userJid)) {
            await sock.sendMessage(jid, { text: `⚠️ Ya tienes una partida activa.` }, { quoted: mensaje })
            return
        }

        const numero = Math.floor(Math.random() * 20) + 1
        let intentos = 0
        const maxIntentos = 5
        sesionesActivas.set(userJid, true)
        await registrarCooldown(userJid, 'adivinanumero', 3)

        await sock.sendMessage(jid, {
            text: `🔢 *ADIVINA EL NÚMERO*\n\nPienso en un número del *1 al 20*.\nTienes *${maxIntentos} intentos*.\n\n¡Empieza!`
        }, { quoted: mensaje })

        let terminado = false

        const listener = async ({ messages }) => {
            if (terminado) return
            for (const m of messages) {
                if (terminado) break
                const autor = m.key.participant || m.key.remoteJid
                if (autor !== userJid || m.key.remoteJid !== jid) continue
                const texto = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim()
                const num = parseInt(texto)
                if (isNaN(num)) continue

                intentos++

                if (num === numero) {
                    terminado = true
                    sesionesActivas.delete(userJid)
                    sock.ev.off('messages.upsert', listener)
                    const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
                    await darRecompensaJuego(userJid, 6, 20)
                    await intentarDarEstrella(userJid, sock, jid, mensaje)
                    await sock.sendMessage(jid, {
                        text: `✅ *¡CORRECTO!*\n\nEl número era *${numero}* en *${intentos} intento${intentos > 1 ? 's' : ''}*!\n✨ *+6 XP* | 💰 *+20 monedas*\n🏆 *Victorias totales:* ${victorias}`
                    }, { quoted: m })
                } else if (intentos >= maxIntentos) {
                    terminado = true
                    sesionesActivas.delete(userJid)
                    sock.ev.off('messages.upsert', listener)
                    await sock.sendMessage(jid, {
                        text: `❌ *¡Sin intentos!*\n\nEl número era *${numero}*.`
                    }, { quoted: m })
                } else {
                    const pista = num < numero ? '📈 Es mayor' : '📉 Es menor'
                    await sock.sendMessage(jid, {
                        text: `${pista}. Te quedan *${maxIntentos - intentos} intentos*.`
                    }, { quoted: m })
                }
            }
        }

        sock.ev.on('messages.upsert', listener)
    }
}

export default adivinanumero