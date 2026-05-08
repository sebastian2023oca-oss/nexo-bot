import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'

const invertir = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.invertir <cantidad>*\n\n📌 Ejemplo: *.invertir 1000*`
            }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'invertir', 20)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para invertir de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if ((rows[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, {
                text: `❌ No tienes suficiente dinero.\n\n💵 *Tu balance:* ${rows[0].monedas || 0} monedas`
            }, { quoted: mensaje })
            return
        }

        // 50% ganar, 30% perder, 20% empatar
        const resultado = Math.random()
        let ganancia, texto

        if (resultado < 0.5) {
            const porcentaje = Math.floor(Math.random() * 50 + 10)
            ganancia = Math.floor(cantidad * porcentaje / 100)
            texto = `📈 *¡Inversión exitosa!*\n\nGanaste *${ganancia} monedas* (${porcentaje}% de retorno).`
            await db.execute('UPDATE usuarios SET monedas = monedas - ? + ? WHERE jid = ?', [cantidad, cantidad + ganancia, userJid])
        } else if (resultado < 0.8) {
            ganancia = -Math.floor(cantidad * (Math.random() * 0.5 + 0.1))
            texto = `📉 *Inversión fallida.*\n\nPerdiste *${Math.abs(ganancia)} monedas*.`
            await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [Math.abs(ganancia), userJid])
        } else {
            ganancia = 0
            texto = `➡️ *Inversión neutral.*\n\nRecuperaste tu dinero sin ganancias ni pérdidas.`
        }

        await db.execute('INSERT INTO inversiones (jid, cantidad, estado) VALUES (?, ?, ?)',
            [userJid, cantidad, ganancia > 0 ? 'completada' : ganancia < 0 ? 'perdida' : 'completada'])

        await registrarCooldown(userJid, 'invertir', 20)

        await sock.sendMessage(jid, {
            text: `📊 *INVERSIÓN*\n\n${texto}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + ganancia} monedas`
        }, { quoted: mensaje })
    }
}

export default invertir