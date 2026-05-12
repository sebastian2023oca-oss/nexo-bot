import db from './db.js'
import { verificarCooldown, registrarCooldown, darXP } from './utils.js'

const minar = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'minar', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para minar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const recursos = ['⛏️ Bitcoin', '💎 Ethereum', '🪙 Litecoin', '🔷 Solana']
        const recurso = recursos[Math.floor(Math.random() * recursos.length)]
        let ganancia = Math.floor(Math.random() * 400) + 100
        const xpGanado = Math.floor(Math.random() * 8) + 3

        // Verificar pico_reforzado equipado → doble recursos
        const [pico] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = "pico_reforzado" AND equipado = 1',
            [userJid]
        )
        const tienePico = pico.length > 0
        if (tienePico) ganancia = ganancia * 2

        // Verificar amuleto_suerte equipado → +30% drops
        const [amuleto] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = "amuleto_suerte" AND equipado = 1',
            [userJid]
        )
        if (amuleto.length > 0) ganancia = Math.floor(ganancia * 1.3)

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [ganancia, userJid])
        await registrarCooldown(userJid, 'minar', 15)
        await darXP(userJid, xpGanado)

        const picoTexto = tienePico ? '\n⛏️ *Pico Reforzado activo!* (x2 recursos)' : ''

        await sock.sendMessage(jid, {
            text: `⛏️ *MINERÍA*\n\nMinaste *${recurso}* y obtuviste *${ganancia} monedas*.${picoTexto}\n✨ *XP ganado:* +${xpGanado}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + ganancia} monedas`
        }, { quoted: mensaje })
    }
}

export default minar