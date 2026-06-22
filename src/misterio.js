import db from './db.js'
import { verificarCooldown, registrarCooldown, darXP } from './utils.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const eventos = [
    { texto: '🛸 Un OVNI te regaló monedas extraterrestres', mult: 3 },
    { texto: '🎪 Encontraste un circo abandonado con un cofre', mult: 2 },
    { texto: '🌪️ Un tornado se llevó parte de tu dinero', mult: 0.3 },
    { texto: '🧙 Un mago te triplicó la apuesta por diversión', mult: 3 },
    { texto: '🐉 Un dragón custodiaba el tesoro y te dejó pasar', mult: 2.5 },
    { texto: '👻 Un fantasma te asustó y perdiste casi todo', mult: 0.1 },
    { texto: '🍄 Te encontraste con hongos mágicos y tu suerte cambió', mult: 1.8 },
    { texto: '⚡ Un rayo cayó cerca y se quemaron tus monedas', mult: 0 },
    { texto: '🎁 Santa llegó adelantado este año', mult: 2 },
    { texto: '🕳️ Caíste en un hoyo negro económico', mult: 0.2 },
]

const misterio = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.misterio <cantidad>*` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'misterio', 12)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if ((rows[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero.\n\n💵 *Tu balance:* ${rows[0].monedas || 0} monedas` }, { quoted: mensaje })
            return
        }

        const evento = eventos[Math.floor(Math.random() * eventos.length)]
        const premio = Math.floor(cantidad * evento.mult)
        const ganancia = premio - cantidad

        await db.execute('UPDATE usuarios SET monedas = monedas - ? + ? WHERE jid = ?', [cantidad, premio, userJid])
        await registrarCooldown(userJid, 'misterio', 12)
        await registrarJugadaCasino(userJid, 'misterio', cantidad, ganancia >= 0 ? 'gano' : 'perdio', ganancia)

        await sock.sendMessage(jid, {
            text: `❓ *EVENTO MISTERIOSO*\n\n${evento.texto}\n\n💰 *Apostado:* ${cantidad} monedas\n🎁 *Obtenido:* ${premio} monedas\n${ganancia >= 0 ? '📈' : '📉'} *Resultado:* ${ganancia >= 0 ? '+' : ''}${ganancia} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - cantidad + premio} monedas`
        }, { quoted: mensaje })
    }
}

export default misterio
