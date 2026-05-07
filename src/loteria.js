import db from './db.js'

const PRECIO_BOLETO = 100
const PREMIO_MAYOR = 5000

const loteria = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

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

        // Verificar poción de suerte
        const [pocion] = await db.execute(
            'SELECT * FROM items_activos WHERE jid = ? AND item = "pocion" AND expira > NOW()',
            [userJid]
        )
        const tienePocion = pocion.length > 0

        const numero = Math.floor(Math.random() * 100)
        let premio = 0
        let texto = ''

        if (numero === 77) {
            premio = PREMIO_MAYOR
            texto = `🎰 *¡PREMIO MAYOR!*\n\n🎉 ¡Ganaste *${PREMIO_MAYOR} monedas*!\n\nNúmero ganador: *77*`
        } else if (numero % 10 === 0 || (tienePocion && numero % 8 === 0)) {
            premio = 500
            texto = `🎲 *¡Premio!*\n\nGanaste *500 monedas*.\n\nNúmero: *${numero}*`
        } else if (numero % 5 === 0 || (tienePocion && numero % 4 === 0)) {
            premio = 200
            texto = `🎲 *¡Pequeño premio!*\n\nGanaste *200 monedas*.\n\nNúmero: *${numero}*`
        } else {
            texto = `😔 *Sin suerte esta vez.*\n\nNúmero: *${numero}*\n\n💡 ¡Intenta de nuevo!`
        }

        if (premio > 0) {
            await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [premio, userJid])
        }

        const pocionTexto = tienePocion ? '\n🧪 *Poción de suerte activa*' : ''

        await sock.sendMessage(jid, {
            text: `🎟️ *LOTERÍA*\n\n${texto}${pocionTexto}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - PRECIO_BOLETO + premio} monedas`
        }, { quoted: mensaje })
    }
}

export default loteria