import db from './db.js'
import { verificarCooldown, registrarCooldown, darXP } from './utils.js'

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
        let valor = animal.valor
        const xpGanado = valor > 0 ? Math.floor(Math.random() * 8) + 3 : 1

        // Verificar trampa_caza equipada → +40% captura
        const [trampa] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = "trampa_caza" AND equipado = 1',
            [userJid]
        )
        const tieneTrampa = trampa.length > 0
        if (tieneTrampa && valor > 0) valor = Math.floor(valor * 1.4)

        if (valor > 0) {
            await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [valor, userJid])
        }
        await registrarCooldown(userJid, 'cazar', 15)
        await darXP(userJid, xpGanado)

        const trampaTexto = tieneTrampa && valor > 0 ? '\n🪤 *Trampa de Caza activa!* (+40% valor)' : ''

        await sock.sendMessage(jid, {
            text: `🏹 *CAZA*\n\n${valor > 0 ? `Cazaste *${animal.nombre}* y lo vendiste por *${valor} monedas*.` : `*${animal.nombre}*... Más suerte la próxima vez.`}${trampaTexto}\n✨ *XP ganado:* +${xpGanado}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + valor} monedas`
        }, { quoted: mensaje })
    }
}

export default cazar