import db from './db.js'
import { cobrarImpuesto, verificarCooldown, registrarCooldown } from './utils.js'

const retirar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.retirar <cantidad>*` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'retirar', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para retirar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const u = rows[0]

        if ((u.banco || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero en el banco.\n\n🏦 *En banco:* ${u.banco || 0} monedas` }, { quoted: mensaje })
            return
        }

        await cobrarImpuesto(userJid, u.monedas)
        await db.execute('UPDATE usuarios SET banco = banco - ?, monedas = monedas + ? WHERE jid = ?', [cantidad, cantidad, userJid])
        await registrarCooldown(userJid, 'retirar')

        await sock.sendMessage(jid, {
            text: `💵 *RETIRO EXITOSO*\n\n✅ Retiraste *${cantidad} monedas* del banco.\n\n💵 *En mano:* ${(u.monedas || 0) + cantidad} monedas\n🏦 *En banco:* ${(u.banco || 0) - cantidad} monedas`
        }, { quoted: mensaje })
    }
}

export default retirar
