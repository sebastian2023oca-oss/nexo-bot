import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'

const PRECIO_BOLETO = 100
const PREMIO_MAYOR = 5000

const loteria = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'loteria', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if ((rows[0].monedas || 0) < PRECIO_BOLETO) {
            await sock.sendMessage(jid, {
                text: `❌ Necesitas *${PRECIO_BOLETO} monedas* para participar.\n\n💵 *Tu balance:* ${rows[0].monedas || 0} monedas`
            }, { quoted: mensaje })
            return
        }

        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [PRECIO_BOLETO, userJid])

        const [pocion] = await db.execute(
            'SELECT * FROM items_activos WHERE jid = ? AND item = "pocion" AND expira > NOW()',
            [userJid]
        )
        const tienePocion = pocion.length > 0

        const numero = Math.floor(Math.random() * 100)
        let premio = 0
        let texto = ''

        // 30% de probabilidad total de ganar algún premio (manteniendo
        // el premio mayor como el más raro dentro de ese 30%).
        const probGanar = tienePocion ? 0.35 : 0.3

        if (Math.random() < probGanar) {
            const rand = Math.random()
            if (rand < 0.05) {
                premio = PREMIO_MAYOR
                texto = `🎰 *¡PREMIO MAYOR!*\n\n🎉 ¡Ganaste *${PREMIO_MAYOR} monedas*!\n\nNúmero ganador: *${numero}*`
            } else if (rand < 0.35) {
                premio = 500
                texto = `🎲 *¡Premio!*\n\nGanaste *500 monedas*.\n\nNúmero: *${numero}*`
            } else {
                premio = 200
                texto = `🎲 *¡Pequeño premio!*\n\nGanaste *200 monedas*.\n\nNúmero: *${numero}*`
            }
        } else {
            texto = `😔 *Sin suerte esta vez.*\n\nNúmero: *${numero}*\n\n💡 ¡Intenta de nuevo!`
        }

        if (premio > 0) {
            await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [premio, userJid])
        }

        await registrarCooldown(userJid, 'loteria', 15)
        const pocionTexto = tienePocion ? '\n🧪 *Poción de suerte activa*' : ''

        await sock.sendMessage(jid, {
            text: `🎟️ *LOTERÍA*\n\n${texto}${pocionTexto}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - PRECIO_BOLETO + premio} monedas`
        }, { quoted: mensaje })
    }
}

export default loteria