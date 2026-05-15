import db from './db.js'
import { verificarCooldown, registrarCooldown, darXP } from './utils.js'
import {
    calcularMultiplicadorMejora,
    formatearLineaBonus,
    obtenerItemEquipado
} from './mejorasItems.js'

const COOLDOWN_MINUTOS = 15

const minar = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'minar', COOLDOWN_MINUTOS)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para minar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [usuarios] = await db.execute(
            'SELECT monedas FROM usuarios WHERE jid = ?',
            [userJid]
        )

        if (usuarios.length === 0) {
            await sock.sendMessage(jid, { text: '❌ No estás registrado en el bot.' }, { quoted: mensaje })
            return
        }

        const recursos = ['⛏️ Bitcoin', '💎 Ethereum', '🪙 Litecoin', '🔷 Solana']
        const recurso = recursos[Math.floor(Math.random() * recursos.length)]
        const gananciaBase = Math.floor(Math.random() * 400) + 100
        const xpGanado = Math.floor(Math.random() * 8) + 3

        const pico = await obtenerItemEquipado(userJid, 'pico_reforzado')
        const amuleto = await obtenerItemEquipado(userJid, 'amuleto_suerte')

        const multiplicadorPico = calcularMultiplicadorMejora('pico_reforzado', pico)
        const multiplicadorAmuleto = calcularMultiplicadorMejora('amuleto_suerte', amuleto)

        let gananciaFinal = Math.floor(gananciaBase * multiplicadorPico)
        gananciaFinal = Math.floor(gananciaFinal * multiplicadorAmuleto)

        await db.execute(
            'UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?',
            [gananciaFinal, userJid]
        )
        await registrarCooldown(userJid, 'minar', COOLDOWN_MINUTOS)
        await darXP(userJid, xpGanado)

        const balanceActual = Number(usuarios[0].monedas || 0) + gananciaFinal
        const picoTexto = formatearLineaBonus('pico_reforzado', pico, 'activo')
        const amuletoTexto = formatearLineaBonus('amuleto_suerte', amuleto, 'activo')

        await sock.sendMessage(jid, {
            text: `⛏️ *MINERÍA*\n\nMinaste *${recurso}*.\n\n📦 *Ganancia base:* ${gananciaBase} monedas\n💰 *Ganancia final:* ${gananciaFinal} monedas${picoTexto}${amuletoTexto}\n✨ *XP ganado:* +${xpGanado}\n\n💵 *Balance actual:* ${balanceActual} monedas`
        }, { quoted: mensaje })
    }
}

export default minar