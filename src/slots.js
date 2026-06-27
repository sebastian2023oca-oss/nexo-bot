import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'

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

        // 30% de probabilidad de ganar (premio fijo). Las rachas/iconos
        // mostrados son puramente visuales: el resultado ya está decidido
        // por la probabilidad fija de 30/70 antes de "girar".
        const gano = Math.random() < 0.3

        let r1, r2, r3, premio, resultado

        if (gano) {
            // Determina cuál combinación ganadora mostrar (con su propio premio)
            const rand = Math.random()
            if (rand < 0.05) {
                r1 = r2 = r3 = '7️⃣'
                premio = 5000
                resultado = '🎰 *¡JACKPOT! TRIPLE 7!*'
            } else if (rand < 0.20) {
                r1 = r2 = r3 = '💎'
                premio = 2000
                resultado = '💎 *¡TRIPLE DIAMANTE!*'
            } else if (rand < 0.55) {
                const s = simbolos[Math.floor(Math.random() * simbolos.length)]
                r1 = r2 = r3 = s
                premio = 500
                resultado = '✅ *¡TRIPLE!*'
            } else {
                const s = simbolos[Math.floor(Math.random() * simbolos.length)]
                let otro
                do { otro = simbolos[Math.floor(Math.random() * simbolos.length)] } while (otro === s)
                r1 = s; r2 = s; r3 = otro
                premio = 100
                resultado = '🎯 *¡PAR!*'
            }
        } else {
            premio = 0
            resultado = '❌ *Sin suerte*'
            // Generar tres símbolos visualmente distintos (sin combinación)
            do {
                r1 = simbolos[Math.floor(Math.random() * simbolos.length)]
                r2 = simbolos[Math.floor(Math.random() * simbolos.length)]
                r3 = simbolos[Math.floor(Math.random() * simbolos.length)]
            } while (r1 === r2 || r2 === r3 || r1 === r3)
        }

        await db.execute('UPDATE usuarios SET monedas = monedas - ? + ? WHERE jid = ?', [COSTO, premio, userJid])
        await registrarCooldown(userJid, 'slots', 15)

        await sock.sendMessage(jid, {
            text: `🎰 *TRAGAMONEDAS*\n\n┌─────────────────┐\n│  ${r1}  │  ${r2}  │  ${r3}  │\n└─────────────────┘\n\n${resultado}\n${premio > 0 ? `💰 *Premio:* +${premio} monedas` : ''}\n💸 *Costo:* -${COSTO} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - COSTO + premio} monedas`
        }, { quoted: mensaje })
    }
}

export default slots