import db from './db.js'
import { verificarCooldown, registrarCooldown, darXP } from './utils.js'

const trabajos = [
    { texto: '🔧 Trabajaste como mecánico.', ganancia: [100, 300] },
    { texto: '🍕 Repartiste pizzas', ganancia: [80, 200] },
    { texto: '💻 Programaste una app', ganancia: [200, 500] },
    { texto: '🚗 Fuiste conductor de taxi', ganancia: [100, 250] },
    { texto: '🏗️ Trabajaste en construcción', ganancia: [150, 350] },
    { texto: '📦 Repartiste paquetes', ganancia: [90, 180] },
    { texto: '🎨 Hiciste diseño gráfico', ganancia: [200, 400] },
    { texto: '🍔 Trabajaste en un restaurante', ganancia: [100, 220] },
]

const work = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'work', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Ya trabajaste hace poco.\n\n⌛ Podrás trabajar de nuevo en *${enCooldown} minutos*` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)]
        let ganancia = Math.floor(Math.random() * (trabajo.ganancia[1] - trabajo.ganancia[0] + 1)) + trabajo.ganancia[0]
        const xpGanado = Math.floor(Math.random() * 10) + 5

        // Verificar doble_work activo
        const [dobleWork] = await db.execute(
            'SELECT * FROM items_activos WHERE jid = ? AND item = "doble_work" AND expira > NOW()',
            [userJid]
        )
        const tieneDoble = dobleWork.length > 0
        if (tieneDoble) ganancia = ganancia * 2

        // Verificar doble_xp activo
        const [dobleXp] = await db.execute(
            'SELECT * FROM items_activos WHERE jid = ? AND item = "doble_xp" AND expira > NOW()',
            [userJid]
        )
        const xpFinal = dobleXp.length > 0 ? xpGanado * 2 : xpGanado

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [ganancia, userJid])
        await registrarCooldown(userJid, 'work', 15)
        await darXP(userJid, xpFinal)

        const dobleTexto = tieneDoble ? '\n⚡ *Doble ganancia activa!*' : ''
        const xpTexto = dobleXp.length > 0 ? '\n⚡ *Doble XP activo!*' : ''

        await sock.sendMessage(jid, {
            text: `💼 *TRABAJO*\n\n${trabajo.texto} y ganaste *${ganancia} monedas*.${dobleTexto}\n✨ *XP ganado:* +${xpFinal}${xpTexto}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + ganancia} monedas`
        }, { quoted: mensaje })
    }
}

export default work