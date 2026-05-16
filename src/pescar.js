import db from './db.js'
import { verificarCooldown, registrarCooldown, darXP } from './utils.js'
import {
    calcularMultiplicadorMejora,
    formatearLineaBonus,
    obtenerItemEquipado
} from './mejorasItems.js'

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
        
        // Separamos el valor base del valor final
        let valorBase = pez.valor
        let valorFinal = valorBase 
        const xpGanado = Math.floor(Math.random() * 6) + 2

        const caña = await obtenerItemEquipado(userJid, 'caña_premium')
        const multiplicadorCaña = calcularMultiplicadorMejora('caña_premium', caña)
        
        // Aplicamos la matemática real
        valorFinal = Math.floor(valorBase * multiplicadorCaña)

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [valorFinal, userJid])
        await registrarCooldown(userJid, 'pescar', 15)
        await darXP(userJid, xpGanado)

        const cañaTexto = formatearLineaBonus('caña_premium', caña, 'activa')

        // Nuevo diseño visual para que el jugador entienda la ganancia
        await sock.sendMessage(jid, {
            text: `🎣 *PESCA*\n\nPescaste *${pez.nombre}*.\n\n📦 *Valor base:* ${valorBase} monedas\n💰 *Total ganado:* ${valorFinal} monedas${cañaTexto}\n✨ *XP ganado:* +${xpGanado}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + valorFinal} monedas`
        }, { quoted: mensaje })
    }
}

export default pescar