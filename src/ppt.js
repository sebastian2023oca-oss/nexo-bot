import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const ppt = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'ppt', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso: *.ppt <piedra/papel/tijera>*` }, { quoted: mensaje })
            return
        }

        const opciones = ['piedra', 'papel', 'tijera']
        const jugador = args[0].toLowerCase()

        if (!opciones.includes(jugador)) {
            await sock.sendMessage(jid, { text: `❌ Elige: *piedra*, *papel* o *tijera*` }, { quoted: mensaje })
            return
        }

        const pierdeContra = { piedra: 'papel', papel: 'tijera', tijera: 'piedra' } // lo que le gana a "jugador"
        const ganaA = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' } // lo que "jugador" le gana

        // Se decide primero el desenlace con 30/70, luego se elige la
        // jugada del bot consistente con ese desenlace.
        const rand = Math.random()
        let bot, resultado
        if (rand < 0.3) {
            bot = ganaA[jugador]
            resultado = 'gana'
        } else if (rand < 0.45) {
            bot = jugador
            resultado = 'empate'
        } else {
            bot = pierdeContra[jugador]
            resultado = 'pierde'
        }

        const emojis = { piedra: '🪨', papel: '📄', tijera: '✂️' }

        await registrarCooldown(userJid, 'ppt', 3)

        if (resultado === 'gana') {
            const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
            await darRecompensaJuego(userJid, 4, 12)
            await intentarDarEstrella(userJid, sock, jid, mensaje)
            await sock.sendMessage(jid, {
                text: `✊ *PIEDRA, PAPEL O TIJERA*\n\nTú: ${emojis[jugador]} *${jugador}*\nBot: ${emojis[bot]} *${bot}*\n\n✅ *¡GANASTE!*\n✨ *+4 XP* | 💰 *+12 monedas*\n🏆 *Victorias totales:* ${victorias}`
            }, { quoted: mensaje })
        } else if (resultado === 'empate') {
            await sock.sendMessage(jid, {
                text: `✊ *PIEDRA, PAPEL O TIJERA*\n\nTú: ${emojis[jugador]} *${jugador}*\nBot: ${emojis[bot]} *${bot}*\n\n🤝 *¡EMPATE!*`
            }, { quoted: mensaje })
        } else {
            await sock.sendMessage(jid, {
                text: `✊ *PIEDRA, PAPEL O TIJERA*\n\nTú: ${emojis[jugador]} *${jugador}*\nBot: ${emojis[bot]} *${bot}*\n\n❌ *¡PERDISTE!*`
            }, { quoted: mensaje })
        }
    }
}

export default ppt