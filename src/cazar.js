import db from './db.js'
import { verificarCooldown, registrarCooldown, darXP } from './utils.js'
import {
    calcularMultiplicadorMejora,
    formatearLineaBonus,
    obtenerItemEquipado
} from './mejorasItems.js'

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
        
        let valorBase = animal.valor
        let valorFinal = valorBase
        const xpGanado = valorBase > 0 ? Math.floor(Math.random() * 8) + 3 : 1

        const trampa = await obtenerItemEquipado(userJid, 'trampa_caza')
        const multiplicadorTrampa = calcularMultiplicadorMejora('trampa_caza', trampa)
        
        if (valorBase > 0) {
            valorFinal = Math.floor(valorBase * multiplicadorTrampa)
            await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [valorFinal, userJid])
        }
        
        await registrarCooldown(userJid, 'cazar', 15)
        await darXP(userJid, xpGanado)

        const trampaTexto = valorBase > 0 ? formatearLineaBonus('trampa_caza', trampa, 'activa') : ''

        let textoRespuesta = `🏹 *CAZA*\n\n`
        if (valorBase > 0) {
            textoRespuesta += `Cazaste *${animal.nombre}*.\n\n📦 *Valor base:* ${valorBase} monedas\n💰 *Total ganado:* ${valorFinal} monedas${trampaTexto}\n✨ *XP ganado:* +${xpGanado}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + valorFinal} monedas`
        } else {
            textoRespuesta += `*${animal.nombre}*... Más suerte la próxima vez.\n✨ *XP ganado:* +${xpGanado}\n\n💵 *Balance actual:* ${rows[0].monedas || 0} monedas`
        }

        await sock.sendMessage(jid, { text: textoRespuesta }, { quoted: mensaje })
    }
}

export default cazar