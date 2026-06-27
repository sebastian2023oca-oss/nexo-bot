import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const dado = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'dado', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        // El resultado de ganar/perder se decide primero con 30/70, y
        // luego se elige un número de dado consistente con ese desenlace
        // (5-6 si gana, 1-4 si pierde) para mantener la mecánica visual.
        const gano = Math.random() < 0.3
        const resultado = gano
            ? (Math.floor(Math.random() * 2) + 5) // 5 o 6
            : (Math.floor(Math.random() * 4) + 1) // 1 a 4
        const emojis = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣']

        await registrarCooldown(userJid, 'dado', 3)

        if (gano) {
            const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
            await darRecompensaJuego(userJid, 3, 10)
            await intentarDarEstrella(userJid, sock, jid, mensaje)
            await sock.sendMessage(jid, {
                text: `🎲 *DADO*\n\n${emojis[resultado]} Salió el *${resultado}*\n\n✅ *¡Número alto! Ganaste!*\n✨ *+3 XP* | 💰 *+10 monedas*\n🏆 *Victorias totales:* ${victorias}`
            }, { quoted: mensaje })
        } else {
            await sock.sendMessage(jid, {
                text: `🎲 *DADO*\n\n${emojis[resultado]} Salió el *${resultado}*\n\n❌ *Número bajo. Necesitas 5 o 6 para ganar.*`
            }, { quoted: mensaje })
        }
    }
}

export default dado