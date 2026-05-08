import db from './db.js'
import { cobrarImpuesto, verificarCooldown, registrarCooldown, darXP } from './utils.js'

const cazar = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'cazar', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para cazar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const animales = [
            { nombre: '🐇 Conejo', valor: 80 },
            { nombre: '🦊 Zorro', valor: 150 },
            { nombre: '🐗 Jabalí', valor: 200 },
            { nombre: '🦌 Venado', valor: 300 },
            { nombre: '🐻 Oso', valor: 500 },
            { nombre: '💨 Nada, escapó', valor: 0 },
        ]
        const animal = animales[Math.floor(Math.random() * animales.length)]
        const xpGanado = animal.valor > 0 ? Math.floor(Math.random() * 8) + 3 : 1

        const impuesto = await cobrarImpuesto(userJid, rows[0].monedas)
        if (animal.valor > 0) {
            await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [animal.valor, userJid])
        }
        await registrarCooldown(userJid, 'cazar', 15)
        await darXP(userJid, xpGanado)

        await sock.sendMessage(jid, {
            text: `🏹 *CAZA*\n\n${animal.valor > 0 ? `Cazaste un *${animal.nombre}* y lo vendiste por *${animal.valor} monedas*.` : `*${animal.nombre}*... Más suerte la próxima vez.`}\n✨ *XP ganado:* +${xpGanado}\n💸 *Impuesto (0.1%):* -${impuesto} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + animal.valor - impuesto} monedas`
        }, { quoted: mensaje })
    }
}

export default cazar
