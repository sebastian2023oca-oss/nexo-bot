import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const palabras = [
    'computadora', 'javascript', 'dinosaurio', 'helicoptero',
    'universidad', 'matematicas', 'electricidad', 'fotografia',
    'construccion', 'imaginacion', 'revolucion', 'tecnologia',
]

const sesionesActivas = new Map()

const hangman = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'hangman', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        if (sesionesActivas.has(userJid)) {
            await sock.sendMessage(jid, { text: `⚠️ Ya tienes una partida activa.` }, { quoted: mensaje })
            return
        }

        const palabra = palabras[Math.floor(Math.random() * palabras.length)]
        const letrasAdivinadas = new Set()
        let errores = 0
        const maxErrores = 6
        const figuras = ['😐', '😟', '😰', '😱', '😨', '💀', '☠️']
        const mostrarPalabra = () => palabra.split('').map(l => letrasAdivinadas.has(l) ? l : '_').join(' ')

        sesionesActivas.set(userJid, true)
        await registrarCooldown(userJid, 'hangman', 3)

        await sock.sendMessage(jid, {
            text: `🪢 *AHORCADO*\n\n${figuras[0]} Errores: 0/${maxErrores}\n\n🔤 *${mostrarPalabra()}*\n\nEnvía una letra por mensaje.`
        }, { quoted: mensaje })

        let terminado = false

        const listener = async ({ messages }) => {
            if (terminado) return
            for (const m of messages) {
                if (terminado) break
                const autor = m.key.participant || m.key.remoteJid
                if (autor !== userJid || m.key.remoteJid !== jid) continue
                const texto = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').toLowerCase().trim()
                if (texto.length !== 1 || letrasAdivinadas.has(texto)) continue

                letrasAdivinadas.add(texto)
                if (!palabra.includes(texto)) errores++

                const palabraMostrada = mostrarPalabra()
                const gano = !palabraMostrada.includes('_')
                const perdio = errores >= maxErrores

                if (gano) {
                    terminado = true
                    sesionesActivas.delete(userJid)
                    sock.ev.off('messages.upsert', listener)
                    const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
                    await darRecompensaJuego(userJid, 8, 25)
                    await intentarDarEstrella(userJid, sock, jid, mensaje)
                    await sock.sendMessage(jid, {
                        text: `✅ *¡GANASTE!*\n\nLa palabra era: *${palabra}*\n✨ *+8 XP* | 💰 *+25 monedas*\n🏆 *Victorias totales:* ${victorias}`
                    }, { quoted: m })
                } else if (perdio) {
                    terminado = true
                    sesionesActivas.delete(userJid)
                    sock.ev.off('messages.upsert', listener)
                    await sock.sendMessage(jid, {
                        text: `☠️ *¡PERDISTE!*\n\nLa palabra era: *${palabra}*`
                    }, { quoted: m })
                } else {
                    await sock.sendMessage(jid, {
                        text: `🪢 *AHORCADO*\n\n${figuras[errores]} Errores: ${errores}/${maxErrores}\n\n🔤 *${palabraMostrada}*`
                    }, { quoted: m })
                }
            }
        }

        sock.ev.on('messages.upsert', listener)
    }
}

export default hangman