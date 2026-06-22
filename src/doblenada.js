import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const doblenada = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.doblenada <cantidad>*` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'doblenada', 15)
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

        const gano = Math.random() < 0.48
        const ganancia = gano ? cantidad : -cantidad

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [ganancia, userJid])
        await registrarCooldown(userJid, 'doblenada', 15)
        await registrarJugadaCasino(userJid, 'doblenada', cantidad, gano ? 'gano' : 'perdio', ganancia)

        await sock.sendMessage(jid, {
            text: `🎲 *DOBLE O NADA*\n\n${gano ? `✅ *¡GANASTE!* Duplicaste tu apuesta.\n💰 *Ganancia:* +${cantidad} monedas` : `❌ *¡PERDISTE!* Se fue todo.\n💸 *Pérdida:* -${cantidad} monedas`}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + ganancia} monedas`
        }, { quoted: mensaje })
    }
}

export default doblenada
