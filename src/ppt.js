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

        const bot = opciones[Math.floor(Math.random() * 3)]
        const emojis = { piedra: '🪨', papel: '📄', tijera: '✂️' }

        let resultado
        if (jugador === bot) resultado = 'empate'
        else if (
            (jugador === 'piedra' && bot === 'tijera') ||
            (jugador === 'papel' && bot === 'piedra') ||
            (jugador === 'tijera' && bot === 'papel')
        ) resultado = 'gana'
        else resultado = 'pierde'

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
