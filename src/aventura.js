import db from './db.js'
import { verificarCooldown, registrarCooldown, darXP } from './utils.js'

const aventuras = [
    {
        nombre: '🐉 Guarida del Dragón',
        descripcion: 'Derrotaste al dragón anciano',
        items: ['espada_basica', 'gema_mejora', 'fragmento_raro', 'escudo_hierro'],
        monedas: [500, 1500],
        xp: [50, 80],
        requiere: 'espada_basica'
    },
    {
        nombre: '👹 Mazmorra Profunda',
        descripcion: 'Limpiaste la mazmorra de monstruos',
        items: ['cristal_xp', 'moneda_dorada', 'amuleto_suerte', 'gema_mejora'],
        monedas: [400, 1200],
        xp: [40, 70],
        requiere: null
    },
    {
        nombre: '⚔️ Torneo de Guerreros',
        descripcion: 'Ganaste el torneo de combate',
        items: ['espada_basica', 'escudo_hierro', 'fragmento_raro'],
        monedas: [600, 2000],
        xp: [60, 100],
        requiere: 'espada_basica'
    },
    {
        nombre: '🌑 Santuario Oscuro',
        descripcion: 'Exploraste el santuario prohibido',
        items: ['gema_mejora', 'fragmento_raro', 'cristal_xp'],
        monedas: [300, 900],
        xp: [30, 60],
        requiere: null
    },
]

const aventura = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'aventura', 180)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para ir de aventura de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        // Filtrar aventuras disponibles
        const disponibles = []
        for (const av of aventuras) {
            if (!av.requiere) {
                disponibles.push(av)
            } else {
                const [tiene] = await db.execute(
                    'SELECT * FROM inventario_usuario WHERE jid = ? AND item = ? AND equipado = 1',
                    [userJid, av.requiere]
                )
                if (tiene.length > 0) disponibles.push(av)
            }
        }

        if (disponibles.length === 0) {
            await sock.sendMessage(jid, {
                text: `❌ No tienes ítems suficientes para ninguna aventura.\n\n💡 Equipa una *Espada Básica* para acceder a más aventuras.\n💡 Cómprala en la *.tienda*`
            }, { quoted: mensaje })
            return
        }

        const av = disponibles[Math.floor(Math.random() * disponibles.length)]
        const monedas = Math.floor(Math.random() * (av.monedas[1] - av.monedas[0])) + av.monedas[0]
        const xpGanado = Math.floor(Math.random() * (av.xp[1] - av.xp[0])) + av.xp[0]

        // 75% probabilidad de conseguir ítem (mayor que expedición)
        const consigueItem = Math.random() < 0.75
        const itemConseguido = consigueItem ? av.items[Math.floor(Math.random() * av.items.length)] : null

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [monedas, userJid])
        await darXP(userJid, xpGanado)
        await registrarCooldown(userJid, 'aventura', 180)

        if (itemConseguido) {
            const [yaExiste] = await db.execute(
                'SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?', [userJid, itemConseguido]
            )
            if (yaExiste.length > 0) {
                await db.execute('UPDATE inventario_usuario SET cantidad = cantidad + 1 WHERE jid = ? AND item = ?', [userJid, itemConseguido])
            } else {
                await db.execute('INSERT INTO inventario_usuario (jid, item, cantidad) VALUES (?, ?, 1)', [userJid, itemConseguido])
            }
            await db.execute('INSERT INTO historico_items (jid, accion, item) VALUES (?, "aventura", ?)', [userJid, itemConseguido])
        }

        const itemTexto = itemConseguido
            ? `\n🎒 *¡Obtuviste:* *${itemConseguido}*!`
            : `\n🎒 Esta vez no obtuviste ningún ítem.`

        await sock.sendMessage(jid, {
            text: `⚔️ *AVENTURA*\n\n*${av.nombre}*\n${av.descripcion}.\n\n💰 *Monedas:* +${monedas}\n✨ *XP:* +${xpGanado}${itemTexto}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + monedas} monedas\n\n⏳ Próxima aventura disponible en *3 horas*.`
        }, { quoted: mensaje })
    }
}

export default aventura
