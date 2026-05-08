import db from './db.js'
import { cobrarImpuesto, verificarCooldown, registrarCooldown, darXP } from './utils.js'

const negocio = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'negocio', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Tu negocio necesita *${enCooldown} minutos* para generar más ingresos.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const negocios = [
            { nombre: '🍔 Puesto de comida', ganancia: [150, 350] },
            { nombre: '👕 Tienda de ropa', ganancia: [200, 400] },
            { nombre: '💈 Barbería', ganancia: [100, 250] },
            { nombre: '🖥️ Cibercafé', ganancia: [180, 380] },
            { nombre: '🏪 Minimarket', ganancia: [120, 300] },
        ]
        const neg = negocios[Math.floor(Math.random() * negocios.length)]
        const ganancia = Math.floor(Math.random() * (neg.ganancia[1] - neg.ganancia[0])) + neg.ganancia[0]
        const xpGanado = Math.floor(Math.random() * 8) + 4

        const impuesto = await cobrarImpuesto(userJid, rows[0].monedas)
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [ganancia, userJid])
        await registrarCooldown(userJid, 'negocio', 15)
        await darXP(userJid, xpGanado)

        await sock.sendMessage(jid, {
            text: `🏢 *NEGOCIO*\n\nTu *${neg.nombre}* generó *${ganancia} monedas*.\n✨ *XP ganado:* +${xpGanado}\n💸 *Impuesto (0.5%):* -${impuesto} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + ganancia - impuesto} monedas`
        }, { quoted: mensaje })
    }
}

export default negocio
