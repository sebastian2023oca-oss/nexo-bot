import db from './db.js'

const RECOMPENSAS_TOP = { 1: 1500, 2: 1000, 3: 500 }
const INSIGNIAS_TOP = {
    1:  '🥇 Leyenda del Top 1',
    2:  '🥈 Élite del Top 2',
    3:  '🥉 Élite del Top 3',
    4:  '4️⃣ Top 4 Global',
    5:  '5️⃣ Top 5 Global',
    6:  '6️⃣ Top 6 Global',
    7:  '7️⃣ Top 7 Global',
    8:  '8️⃣ Top 8 Global',
    9:  '9️⃣ Top 9 Global',
    10: '🔟 Top 10 Global',
}

const top = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        const [rows] = await db.execute(
            'SELECT jid, nombre, nivel, xp FROM usuarios ORDER BY xp DESC LIMIT 10'
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `📊 Aún no hay usuarios registrados.` }, { quoted: mensaje })
            return
        }

        const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
        let texto = `🏆 *TOP 10 USUARIOS*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        const menciones = []

        rows.forEach((u, i) => {
            texto += `${medallas[i]} @${u.jid.split('@')[0]} — Nv.${u.nivel || 1} (${u.xp || 0} XP)\n`
            menciones.push(u.jid)
        })

        texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto, mentions: menciones }, { quoted: mensaje })

        // Dar insignias por posición (solo una vez por posición)
        for (let i = 0; i < rows.length; i++) {
            const posicion = i + 1
            const u = rows[i]
            const nombreInsignia = INSIGNIAS_TOP[posicion]

            if (nombreInsignia) {
                const [yaLaTiene] = await db.execute(
                    'SELECT id FROM insignias WHERE jid = ? AND nombre = ?',
                    [u.jid, nombreInsignia]
                )
                if (yaLaTiene.length === 0) {
                    await db.execute('INSERT INTO insignias (jid, nombre) VALUES (?, ?)', [u.jid, nombreInsignia])
                    await sock.sendMessage(jid, {
                        text: `🏅 ¡@${u.jid.split('@')[0]} obtuvo la insignia *${nombreInsignia}*!`,
                        mentions: [u.jid]
                    })
                }
            }
        }

        // Recompensas automáticas para top 1-3 si llevan 3 días en el top
        for (let i = 0; i < Math.min(3, rows.length); i++) {
            const posicion = i + 1
            const u = rows[i]

            const [historial] = await db.execute(
                `SELECT MIN(fecha) as primera FROM top_historial 
                 WHERE jid = ? AND posicion = ? AND fecha >= DATE_SUB(NOW(), INTERVAL 3 DAY)`,
                [u.jid, posicion]
            )

            if (historial[0]?.primera) {
                const dias = (Date.now() - new Date(historial[0].primera).getTime()) / 86400000
                if (dias >= 3) {
                    // Verificar si ya recibió recompensa hoy
                    const [yaRecibio] = await db.execute(
                        `SELECT id FROM top_recompensas 
                         WHERE jid = ? AND posicion = ? AND DATE(fecha) = CURDATE()`,
                        [u.jid, posicion]
                    )
                    if (yaRecibio.length === 0) {
                        const recompensa = RECOMPENSAS_TOP[posicion]
                        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [recompensa, u.jid])
                        await db.execute('INSERT INTO top_recompensas (jid, posicion) VALUES (?, ?)', [u.jid, posicion])
                        await sock.sendMessage(jid, {
                            text: `🎁 ¡@${u.jid.split('@')[0]} recibe *${recompensa} monedas* por mantenerse en el *Top ${posicion}* por 3 días!`,
                            mentions: [u.jid]
                        })
                    }
                }
            }

            // Registrar en historial
            await db.execute(
                'INSERT INTO top_historial (jid, posicion) VALUES (?, ?) ON DUPLICATE KEY UPDATE fecha = NOW()',
                [u.jid, posicion]
            ).catch(() => {})
        }
    }
}

export default top