import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const cofres = [
    { emoji: '🟫', multiplicador: 0 },
    { emoji: '🟦', multiplicador: 0.5 },
    { emoji: '🟩', multiplicador: 1.5 },
    { emoji: '🟨', multiplicador: 2.5 },
    { emoji: '🟪', multiplicador: 4 },
]

const tesoro = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.tesoro <cantidad>*` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'tesoro', 12)
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

        const elegido = cofres[Math.floor(Math.random() * cofres.length)]
        const premio = Math.floor(cantidad * elegido.multiplicador)
        const ganancia = premio - cantidad

        await db.execute('UPDATE usuarios SET monedas = monedas - ? + ? WHERE jid = ?', [cantidad, premio, userJid])
        await registrarCooldown(userJid, 'tesoro', 12)
        await registrarJugadaCasino(userJid, 'tesoro', cantidad, ganancia >= 0 ? 'gano' : 'perdio', ganancia)

        const linea = cofres.map(c => c.emoji).join(' ')

        await sock.sendMessage(jid, {
            text: `🗝️ *COFRE DEL TESORO*\n\n${linea}\n\n${elegido.emoji} *Abriste el cofre ${elegido.emoji}*\n📊 *Multiplicador:* x${elegido.multiplicador}\n\n💰 *Apostado:* ${cantidad} monedas\n🎁 *Obtenido:* ${premio} monedas\n${ganancia >= 0 ? '📈' : '📉'} *Resultado:* ${ganancia >= 0 ? '+' : ''}${ganancia} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - cantidad + premio} monedas`
        }, { quoted: mensaje })
    }
}

export default tesoro
