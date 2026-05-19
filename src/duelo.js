import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const ataques = [
    'un golpe certero', 'una patada voladora', 'un lanzamiento especial',
    'un combo devastador', 'un ataque sorpresa', 'un contraataque épico',
    'una técnica secreta', 'una ráfaga de energía'
]

const duelo = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'duelo', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, { text: `❌ Uso: *.duelo @usuario*` }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes duelarte contigo mismo.` }, { quoted: mensaje })
            return
        }

        const gana = Math.random() < 0.5
        const ataque = ataques[Math.floor(Math.random() * ataques.length)]
        const ganador = gana ? userJid : mencionado
        const perdedor = gana ? mencionado : userJid

        await registrarCooldown(userJid, 'duelo', 3)

        if (gana) {
            const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
            await darRecompensaJuego(userJid, 5, 15)
            await intentarDarEstrella(userJid, sock, jid, mensaje)
        }

        await sock.sendMessage(jid, {
            text: `⚔️ *DUELO*\n\n@${userJid.split('@')[0]} vs @${mencionado.split('@')[0]}\n\n💥 @${userJid.split('@')[0]} usó *${ataque}*!\n\n${gana ? `🏆 *@${ganador.split('@')[0]} GANA el duelo!*\n✨ *+5 XP* | 💰 *+15 monedas*` : `💀 *@${perdedor.split('@')[0]} perdió el duelo.*`}`,
            mentions: [userJid, mencionado]
        }, { quoted: mensaje })
    }
}

export default duelo
