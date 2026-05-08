import db from './db.js'
import { cobrarImpuesto, verificarCooldown, registrarCooldown } from './utils.js'

const COSTO = 50

const slots = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'slots', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if ((rows[0].monedas || 0) < COSTO) {
            await sock.sendMessage(jid, { text: `❌ Necesitas *${COSTO} monedas* para jugar.\n\n💵 *Tu balance:* ${rows[0].monedas || 0} monedas` }, { quoted: mensaje })
            return
        }

        const simbolos = ['🍒', '🍋', '🍊', '⭐', '💎', '7️⃣']
        const r1 = simbolos[Math.floor(Math.random() * simbolos.length)]
        const r2 = simbolos[Math.floor(Math.random() * simbolos.length)]
        const r3 = simbolos[Math.floor(Math.random() * simbolos.length)]

        let premio = 0
        let resultado = ''

        if (r1 === r2 && r2 === r3) {
            if (r1 === '7️⃣') { premio = 5000; resultado = '🎰 *¡JACKPOT! TRIPLE 7!*' }
            else if (r1 === '💎') { premio = 2000; resultado = '💎 *¡TRIPLE DIAMANTE!*' }
            else { premio = 500; resultado = '✅ *¡TRIPLE!*' }
        } else if (r1 === r2 || r2 === r3 || r1 === r3) {
            premio = 100
            resultado = '🎯 *¡PAR!*'
        } else {
            resultado = '❌ *Sin suerte*'
        }

        const impuesto = await cobrarImpuesto(userJid, rows[0].monedas)
        await db.execute('UPDATE usuarios SET monedas = monedas - ? + ? WHERE jid = ?', [COSTO, premio, userJid])
        await registrarCooldown(userJid, 'slots', 15)

        await sock.sendMessage(jid, {
            text: `🎰 *TRAGAMONEDAS*\n\n┌─────────────────┐\n│  ${r1}  │  ${r2}  │  ${r3}  │\n└─────────────────┘\n\n${resultado}\n${premio > 0 ? `💰 *Premio:* +${premio} monedas` : ''}\n💸 *Costo:* -${COSTO} monedas\n💸 *Impuesto (0.5%):* -${impuesto} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - COSTO + premio - impuesto} monedas`
        }, { quoted: mensaje })
    }
}

export default slots
