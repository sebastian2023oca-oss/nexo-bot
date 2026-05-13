import db from './db.js'
import { verificarCooldown, registrarCooldown, darXP } from './utils.js'

const recolectar = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'recolectar', 15)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para recolectar de nuevo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const objetos = [
            { nombre: '🌿 Hierbas medicinales', valor: 60 },
            { nombre: '🪨 Mineral raro', valor: 200 },
            { nombre: '🍄 Hongos exóticos', valor: 120 },
            { nombre: '💎 Gema pequeña', valor: 400 },
            { nombre: '🌾 Semillas valiosas', valor: 80 },
            { nombre: '📦 Caja abandonada', valor: 150 },
        ]
        const objeto = objetos[Math.floor(Math.random() * objetos.length)]
        let valor = objeto.valor
        const xpGanado = Math.floor(Math.random() * 6) + 2

        // Verificar amuleto_suerte equipado → +30%
        const [amuleto] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = "amuleto_suerte" AND equipado = 1', [userJid]
        )
        const tieneAmuleto = amuleto.length > 0
        if (tieneAmuleto) valor = Math.floor(valor * 1.3)

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [valor, userJid])
        await registrarCooldown(userJid, 'recolectar', 15)
        await darXP(userJid, xpGanado)

        const amuletoTexto = tieneAmuleto ? '\n🍀 *Amuleto de Suerte activo!* (+30% valor)' : ''

        await sock.sendMessage(jid, {
            text: `🌿 *RECOLECCIÓN*\n\nEncontraste *${objeto.nombre}* y lo vendiste por *${valor} monedas*.${amuletoTexto}\n✨ *XP ganado:* +${xpGanado}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + valor} monedas`
        }, { quoted: mensaje })
    }
}

export default recolectar