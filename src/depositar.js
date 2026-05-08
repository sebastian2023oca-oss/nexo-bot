import db from './db.js'
import { cobrarImpuesto, verificarCooldown, registrarCooldown } from './utils.js'

const BANCO_MAX = 5000000

const depositar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.depositar <cantidad>*` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'depositar', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para depositar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const u = rows[0]

        if ((u.monedas || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero en mano.\n\n💵 *En mano:* ${u.monedas || 0} monedas` }, { quoted: mensaje })
            return
        }

        if ((u.banco || 0) + cantidad > BANCO_MAX) {
            const espacio = BANCO_MAX - (u.banco || 0)
            await sock.sendMessage(jid, { text: `❌ El banco tiene capacidad máxima de *5,000,000 monedas*.\n\n📊 *Espacio disponible:* ${espacio} monedas` }, { quoted: mensaje })
            return
        }

        await cobrarImpuesto(userJid, u.monedas)
        await db.execute('UPDATE usuarios SET monedas = monedas - ?, banco = banco + ? WHERE jid = ?', [cantidad, cantidad, userJid])
        await registrarCooldown(userJid, 'depositar')

        await sock.sendMessage(jid, {
            text: `🏦 *DEPÓSITO EXITOSO*\n\n✅ Depositaste *${cantidad} monedas* en el banco.\n\n💵 *En mano:* ${(u.monedas || 0) - cantidad} monedas\n🏦 *En banco:* ${(u.banco || 0) + cantidad} monedas`
        }, { quoted: mensaje })
    }
}

export default depositar
