import db from './db.js'

const rank = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT COUNT(*) as pos FROM usuarios WHERE xp > (SELECT xp FROM usuarios WHERE jid = ?)',
            [userJid]
        )

        const [user] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])

        if (user.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const [totalRows] = await db.execute('SELECT COUNT(*) as total FROM usuarios')

        const posicion = (rows[0]?.pos || 0) + 1
        const total = totalRows[0].total
        const u = user[0]
        const porcentaje = Math.round((posicion / total) * 100)

        let medalla = ''
        if (posicion === 1) medalla = '🥇'
        else if (posicion === 2) medalla = '🥈'
        else if (posicion === 3) medalla = '🥉'
        else if (posicion <= 10) medalla = '🏅'
        else medalla = '📊'

        let categoria = ''
        if (porcentaje <= 5) categoria = '👑 Élite'
        else if (porcentaje <= 20) categoria = '💎 Diamante'
        else if (porcentaje <= 40) categoria = '🥇 Oro'
        else if (porcentaje <= 60) categoria = '🥈 Plata'
        else if (porcentaje <= 80) categoria = '🥉 Bronce'
        else categoria = '🌱 Novato'

        await sock.sendMessage(jid, {
            text: `╔════════════════════════════════╗
║        ${medalla}  R A N K I N G  ${medalla}        ║
╚════════════════════════════════╝

👤 *${u.nombre_perfil || u.nombre || 'Usuario'}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 *Posición:* #${posicion} de ${total} usuarios
🎖️ *Categoría:* ${categoria}
⭐ *Nivel:* ${u.nivel || 1}
✨ *XP Total:* ${u.xp || 0}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 *Estás en el top ${porcentaje}% del servidor*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Usa *.top* para ver el ranking global.

╚══════════════════════════════╝`
        }, { quoted: mensaje })
    }
}

export default rank