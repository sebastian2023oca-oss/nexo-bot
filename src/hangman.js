import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const palabras = [
    'computadora', 'javascript', 'dinosaurio', 'helicoptero',
    'universidad', 'matematicas', 'electricidad', 'fotografia',
    'construccion', 'imaginacion', 'revolucion', 'tecnologia',
]

const hangman = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'hangman', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        const palabra = palabras[Math.floor(Math.random() * palabras.length)]
        const letrasAdivinadas = new Set()
        let errores = 0
        const maxErrores = 6

        const mostrarPalabra = () => palabra.split('').map(l => letrasAdivinadas.has(l) ? l : '_').join(' ')
        const ahorcoFiguras = ['😐', '😟', '😰', '😱', '😨', '💀', '☠️']

        await sock.sendMessage(jid, {
            text: `🪢 *AHORCADO*\n\n${ahorcoFiguras[0]} Errores: 0/${maxErrores}\n\n🔤 *${mostrarPalabra()}*\n\nEnvía una letra por mensaje.`
        }, { quoted: mensaje })

        await registrarCooldown(userJid, 'hangman', 3)

        const escuchar = sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const m of messages) {
                const autor = m.key.participant || m.key.remoteJid
                const texto = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').toLowerCase().trim()

                if (autor !== userJid || m.key.remoteJid !== jid || texto.length !== 1) continue

                const letra = texto
                if (letrasAdivinadas.has(letra)) continue
                letrasAdivinadas.add(letra)

                if (!palabra.includes(letra)) errores++

                const palabraMostrada = mostrarPalabra()
                const gano = !palabraMostrada.includes('_')
                const perdio = errores >= maxErrores

                if (gano) {
                    escuchar()
                    const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
                    await darRecompensaJuego(userJid, 8, 25)
                    await intentarDarEstrella(userJid, sock, jid, mensaje)
                    await sock.sendMessage(jid, {
                        text: `✅ *¡GANASTE!*\n\nLa palabra era: *${palabra}*\n✨ *+8 XP* | 💰 *+25 monedas*\n🏆 *Victorias totales:* ${victorias}`
                    }, { quoted: m })
                } else if (perdio) {
                    escuchar()
                    await sock.sendMessage(jid, {
                        text: `☠️ *¡PERDISTE!*\n\nLa palabra era: *${palabra}*`
                    }, { quoted: m })
                } else {
                    await sock.sendMessage(jid, {
                        text: `🪢 *AHORCADO*\n\n${ahorcoFiguras[errores]} Errores: ${errores}/${maxErrores}\n\n🔤 *${palabraMostrada}*`
                    }, { quoted: m })
                }
            }
        })
    }
}

export default hangman
