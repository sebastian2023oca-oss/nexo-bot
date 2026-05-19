import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const eventos = [
    { texto: '🍀 Encontraste una moneda en el suelo', victoria: true },
    { texto: '🌈 El universo está de tu lado hoy', victoria: true },
    { texto: '⚡ Un rayo de buena suerte te golpeó', victoria: true },
    { texto: '🎯 Todo lo que tocas se convierte en oro', victoria: true },
    { texto: '🌟 Las estrellas se alinearon para ti', victoria: true },
    { texto: '🌧️ Empezó a llover justo cuando saliste', victoria: false },
    { texto: '🐈 Un gato negro cruzó tu camino', victoria: false },
    { texto: '🪞 Rompiste un espejo virtual', victoria: false },
    { texto: '🧦 Perdiste un calcetín misteriosamente', victoria: false },
    { texto: '💤 Te quedaste dormido en el momento clave', victoria: false },
]

const suerte = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'suerte', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        // Verificar poción de suerte → más eventos positivos
        const [pocion] = await db.execute(
            'SELECT * FROM items_activos WHERE jid = ? AND item = "pocion" AND expira > NOW()', [userJid]
        )
        const tienePocion = pocion.length > 0
        const prob = tienePocion ? 0.65 : 0.5

        const evento = Math.random() < prob
            ? eventos.filter(e => e.victoria)[Math.floor(Math.random() * 5)]
            : eventos.filter(e => !e.victoria)[Math.floor(Math.random() * 5)]

        await registrarCooldown(userJid, 'suerte', 3)

        if (evento.victoria) {
            const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
            await darRecompensaJuego(userJid, 3, 10)
            await intentarDarEstrella(userJid, sock, jid, mensaje)
            await sock.sendMessage(jid, {
                text: `🎰 *EVENTO DE SUERTE*\n\n${evento.texto}\n\n✅ *¡Buena suerte!*${tienePocion ? '\n🧪 Poción activa (+15% suerte)' : ''}\n✨ *+3 XP* | 💰 *+10 monedas*\n🏆 *Victorias totales:* ${victorias}`
            }, { quoted: mensaje })
        } else {
            await sock.sendMessage(jid, {
                text: `🎰 *EVENTO DE SUERTE*\n\n${evento.texto}\n\n❌ *Mala suerte esta vez...*`
            }, { quoted: mensaje })
        }
    }
}

export default suerte
