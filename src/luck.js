import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const luck = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'luck', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [pocion] = await db.execute(
            'SELECT * FROM items_activos WHERE jid = ? AND item = "pocion" AND expira > NOW()', [userJid]
        )
        const tienePocion = pocion.length > 0
        const prob = tienePocion ? 0.60 : 0.45

        const gano = Math.random() < prob
        const porcentaje = Math.floor(Math.random() * 30) + 50

        await registrarCooldown(userJid, 'luck', 3)

        if (gano) {
            const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
            await darRecompensaJuego(userJid, 3, 10)
            await intentarDarEstrella(userJid, sock, jid, mensaje)
            await sock.sendMessage(jid, {
                text: `🍀 *SISTEMA DE SUERTE*\n\n🎯 Probabilidad: *${porcentaje}%*\n\n✅ *¡GANASTE!*${tienePocion ? '\n🧪 Poción activa (+15%)' : ''}\n✨ *+3 XP* | 💰 *+10 monedas*\n🏆 *Victorias totales:* ${victorias}`
            }, { quoted: mensaje })
        } else {
            await sock.sendMessage(jid, {
                text: `🍀 *SISTEMA DE SUERTE*\n\n🎯 Probabilidad: *${porcentaje}%*\n\n❌ *¡PERDISTE!*\n\nMás suerte la próxima vez.`
            }, { quoted: mensaje })
        }
    }
}

export default luck
