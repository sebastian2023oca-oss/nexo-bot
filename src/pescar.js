import db from './db.js'
import { verificarCooldown, registrarCooldown, darXP } from './utils.js'

const pescar = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'pescar', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para pescar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const peces = [
            { nombre: '🐟 Pez común', valor: 50 },
            { nombre: '🐠 Pez de colores', valor: 100 },
            { nombre: '🦈 Tiburón pequeño', valor: 300 },
            { nombre: '🐡 Pez globo', valor: 150 },
            { nombre: '🎣 Bota vieja', valor: 10 },
            { nombre: '💎 Pez dorado', valor: 500 },
        ]
        const pez = peces[Math.floor(Math.random() * peces.length)]
        let valor = pez.valor
        const xpGanado = Math.floor(Math.random() * 6) + 2

        // Verificar caña_premium equipada → mejor resultado
        const [caña] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = "caña_premium" AND equipado = 1',
            [userJid]
        )
        const tieneCaña = caña.length > 0
        if (tieneCaña) valor = Math.floor(valor * 1.5)

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [valor, userJid])
        await registrarCooldown(userJid, 'pescar', 15)
        await darXP(userJid, xpGanado)

        const cañaTexto = tieneCaña ? '\n🎣 *Caña Premium activa!* (+50% valor)' : ''

        await sock.sendMessage(jid, {
            text: `🎣 *PESCA*\n\nPescaste *${pez.nombre}* y lo vendiste por *${valor} monedas*.${cañaTexto}\n✨ *XP ganado:* +${xpGanado}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + valor} monedas`
        }, { quoted: mensaje })
    }
}

export default pescar