import db from './db.js'
import { verificarCooldown, registrarCooldown, darXP } from './utils.js'
import {
    calcularMultiplicadorMejora,
    formatearLineaBonus,
    obtenerItemEquipado,
    obtenerNivelMejora
} from './mejorasItems.js'

const expediciones = [
    { nombre: '🏔️ Montañas del Norte', descripcion: 'Exploraste las montañas heladas', items: ['fragmento_raro', 'cristal_xp', 'gema_mejora'], monedas: [200, 600], xp: [20, 40] },
    { nombre: '🌋 Volcán Activo', descripcion: 'Sobreviviste al volcán en erupción', items: ['gema_mejora', 'moneda_dorada', 'fragmento_raro'], monedas: [300, 800], xp: [30, 50] },
    { nombre: '🌊 Abismo Marino', descripcion: 'Buceaste en las profundidades del océano', items: ['cristal_xp', 'moneda_dorada', 'amuleto_suerte'], monedas: [150, 500], xp: [15, 35] },
    { nombre: '🌿 Selva Antigua', descripcion: 'Te adentraste en la selva inexplorada', items: ['pocion_vida', 'cristal_xp', 'trampa_caza'], monedas: [100, 400], xp: [10, 30] },
    { nombre: '🏰 Castillo Maldito', descripcion: 'Entraste al castillo oscuro y saliste vivo', items: ['espada_basica', 'escudo_hierro', 'gema_mejora'], monedas: [400, 1000], xp: [40, 60] },
]

const expedicion = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'expedicion', 120)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para ir de expedición de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const exp = expediciones[Math.floor(Math.random() * expediciones.length)]
        let monedas = Math.floor(Math.random() * (exp.monedas[1] - exp.monedas[0])) + exp.monedas[0]
        const xpGanado = Math.floor(Math.random() * (exp.xp[1] - exp.xp[0])) + exp.xp[0]

        const amuleto = await obtenerItemEquipado(userJid, 'amuleto_suerte')
        const multiplicadorAmuleto = calcularMultiplicadorMejora('amuleto_suerte', amuleto)
        const nivelMejoraAmuleto = obtenerNivelMejora(amuleto)
        monedas = Math.floor(monedas * multiplicadorAmuleto)

        const probItem = amuleto ? Math.min(0.95, 0.8 + (nivelMejoraAmuleto * 0.02)) : 0.6
        const consigueItem = Math.random() < probItem
        const itemConseguido = consigueItem ? exp.items[Math.floor(Math.random() * exp.items.length)] : null

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [monedas, userJid])
        await darXP(userJid, xpGanado)
        await registrarCooldown(userJid, 'expedicion', 120)

        if (itemConseguido) {
            const [yaExiste] = await db.execute('SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?', [userJid, itemConseguido])
            if (yaExiste.length > 0) {
                await db.execute('UPDATE inventario_usuario SET cantidad = cantidad + 1 WHERE jid = ? AND item = ?', [userJid, itemConseguido])
            } else {
                await db.execute('INSERT INTO inventario_usuario (jid, item, cantidad) VALUES (?, ?, 1)', [userJid, itemConseguido])
            }
            await db.execute('INSERT INTO historico_items (jid, accion, item) VALUES (?, "expedicion", ?)', [userJid, itemConseguido])
        }

        const amuletoTexto = formatearLineaBonus('amuleto_suerte', amuleto, 'activo')
        const itemTexto = itemConseguido ? `\n🎒 *¡Encontraste:* *${itemConseguido}*!` : `\n🎒 Esta vez no encontraste ningún ítem.`

        await sock.sendMessage(jid, {
            text: `🗺️ *EXPEDICIÓN*\n\n*${exp.nombre}*\n${exp.descripcion}.${amuletoTexto}\n\n💰 *Monedas:* +${monedas}\n✨ *XP:* +${xpGanado}${itemTexto}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + monedas} monedas\n\n⏳ Próxima expedición en *2 horas*.`
        }, { quoted: mensaje })
    }
}

export default expedicion