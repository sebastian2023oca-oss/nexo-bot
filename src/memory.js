import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const emojisPool = ['🍎','🍌','🍇','🍓','🍕','🎮','⚽','🎵','🌟','💎','🔥','🌊']

const sesionesActivas = new Map()

const memory = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'memory', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        if (sesionesActivas.has(userJid)) {
            await sock.sendMessage(jid, { text: `⚠️ Ya tienes una partida activa.` }, { quoted: mensaje })
            return
        }

        const shuffled = [...emojisPool].sort(() => Math.random() - 0.5)
        const secuencia = shuffled.slice(0, 4)
        const respuestaEsperada = secuencia.join(' ')
        sesionesActivas.set(userJid, true)
        await registrarCooldown(userJid, 'memory', 3)

        await sock.sendMessage(jid, {
            text: `🧠 *JUEGO DE MEMORIA*\n\nMemoriza esta secuencia:\n\n*${respuestaEsperada}*\n\n⏳ Tienes *5 segundos*...`
        }, { quoted: mensaje })

        await new Promise(r => setTimeout(r, 5000))

        await sock.sendMessage(jid, {
            text: `❓ *¿Cuál era la secuencia?*\n\nEscribe los emojis en orden separados por espacios.\nTienes *20 segundos*.`
        }, { quoted: mensaje })

        let respondio = false

        const timeout = setTimeout(async () => {
            if (!respondio) {
                respondio = true
                sesionesActivas.delete(userJid)
                await sock.sendMessage(jid, { text: `⏰ *¡Tiempo agotado!*\n\nLa secuencia era: *${respuestaEsperada}*` }, { quoted: mensaje })
            }
        }, 20000)

        const listener = async ({ messages }) => {
            if (respondio) return
            for (const m of messages) {
                if (respondio) break
                const autor = m.key.participant || m.key.remoteJid
                if (autor !== userJid || m.key.remoteJid !== jid) continue
                const texto = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim()
                if (!texto) continue

                respondio = true
                clearTimeout(timeout)
                sesionesActivas.delete(userJid)
                sock.ev.off('messages.upsert', listener)

                if (texto === respuestaEsperada) {
                    const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
                    await darRecompensaJuego(userJid, 7, 22)
                    await intentarDarEstrella(userJid, sock, jid, mensaje)
                    await sock.sendMessage(jid, {
                        text: `✅ *¡CORRECTO!*\n\nLa secuencia era: *${respuestaEsperada}*\n✨ *+7 XP* | 💰 *+22 monedas*\n🏆 *Victorias totales:* ${victorias}`
                    }, { quoted: m })
                } else {
                    await sock.sendMessage(jid, {
                        text: `❌ *Incorrecto.*\n\nLa secuencia era: *${respuestaEsperada}*`
                    }, { quoted: m })
                }
            }
        }

        sock.ev.on('messages.upsert', listener)
    }
}

export default memory