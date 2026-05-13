import db from './db.js'

const stats = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const u = rows[0]
        const fechaRegistro = new Date(u.creado_en).toLocaleDateString('es-CO')

        // Contar ítems equipados
        const [equipados] = await db.execute(
            'SELECT COUNT(*) as total FROM inventario_usuario WHERE jid = ? AND equipado = 1', [userJid]
        )
        const [totalItems] = await db.execute(
            'SELECT COUNT(*) as total FROM inventario_usuario WHERE jid = ?', [userJid]
        )

        await sock.sendMessage(jid, {
            text: `📊 *ESTADÍSTICAS DE ${(u.nombre || 'Usuario').toUpperCase()}*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⭐ *Nivel:* ${u.nivel || 1}\n✨ *XP total:* ${u.xp || 0}\n💵 *Monedas:* ${u.monedas || 0}\n🏦 *Banco:* ${u.banco || 0}\n⭐ *Reputación:* ${u.reputacion || 0}\n🎒 *Ítems en inventario:* ${totalItems[0].total || 0}\n⚔️ *Ítems equipados:* ${equipados[0].total || 0}/5\n📅 *Registrado:* ${fechaRegistro}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        }, { quoted: mensaje })
    }
}

export default stats