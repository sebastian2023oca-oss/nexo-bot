import db from './db.js'
import { cobrarImpuesto, verificarCooldown, registrarCooldown, darXP } from './utils.js'

const recolectar = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'recolectar', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para recolectar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const objetos = [
            { nombre: '🌿 Hierbas medicinales', valor: 60 },
            { nombre: '🪨 Mineral raro', valor: 200 },
            { nombre: '🍄 Hongos exóticos', valor: 120 },
            { nombre: '💎 Gema pequeña', valor: 400 },
            { nombre: '🌾 Semillas valiosas', valor: 80 },
            { nombre: '📦 Caja abandonada', valor: 150 },
        ]
        const objeto = objetos[Math.floor(Math.random() * objetos.length)]
        const xpGanado = Math.floor(Math.random() * 6) + 2

        const impuesto = await cobrarImpuesto(userJid, rows[0].monedas)
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [objeto.valor, userJid])
        await registrarCooldown(userJid, 'recolectar', 15)
        await darXP(userJid, xpGanado)

        await sock.sendMessage(jid, {
            text: `🌿 *RECOLECCIÓN*\n\nEncontraste *${objeto.nombre}* y lo vendiste por *${objeto.valor} monedas*.\n✨ *XP ganado:* +${xpGanado}\n💸 *Impuesto (0.5%):* -${impuesto} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + objeto.valor - impuesto} monedas`
        }, { quoted: mensaje })
    }
}

export default recolectar
