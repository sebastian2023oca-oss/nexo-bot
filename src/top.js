import db from './db.js'

const RECOMPENSAS_TOP = {
    1: 1500,
    2: 1000,
    3: 500,
}

const INSIGNIAS_TOP = {
    1: '🥇 Leyenda del Top 1',
    2: '🥈 Élite del Top 2',
    3: '🥉 Élite del Top 3',
    4: '4️⃣ Top 4 Global',
    5: '5️⃣ Top 5 Global',
    6: '6️⃣ Top 6 Global',
    7: '7️⃣ Top 7 Global',
    8: '8️⃣ Top 8 Global',
    9: '9️⃣ Top 9 Global',
    10: '🔟 Top 10 Global',
}

const MEDALLAS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

async function asegurarTablasTop() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS top_historial (
            id INT AUTO_INCREMENT PRIMARY KEY,
            jid VARCHAR(60) NOT NULL,
            posicion INT NOT NULL,
            fecha DATE NOT NULL,
            creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS top_recompensas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            jid VARCHAR(60) NOT NULL,
            posicion INT NOT NULL,
            monto INT NOT NULL DEFAULT 0,
            fecha DATE NOT NULL,
            creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `)

    // Nueva tabla inteligente para controlar las rachas exactas
    await db.execute(`
        CREATE TABLE IF NOT EXISTS top_rachas (
            jid VARCHAR(60) PRIMARY KEY,
            posicion_actual INT NOT NULL,
            racha_dias INT NOT NULL DEFAULT 1,
            ultima_fecha DATE NOT NULL
        )
    `)
}

async function registrarTopDelDia(rows) {
    await db.execute('DELETE FROM top_historial WHERE fecha = CURDATE()')

    for (let i = 0; i < Math.min(3, rows.length); i++) {
        const posicion = i + 1
        const usuario = rows[i]

        await db.execute(
            `INSERT IGNORE INTO top_historial (jid, posicion, fecha)
             VALUES (?, ?, CURDATE())`,
            [usuario.jid, posicion]
        )
    }
}

async function yaRecibioRecompensaHoy(jid) {
    const [rows] = await db.execute(
        `SELECT id
         FROM top_recompensas
         WHERE jid = ?
           AND fecha = CURDATE()
         LIMIT 1`,
        [jid]
    )
    return rows.length > 0
}

async function darRecompensasTop(sock, jidGrupo, mensaje, rows) {
    for (let i = 0; i < Math.min(3, rows.length); i++) {
        const posicion = i + 1
        const usuario = rows[i]
        const recompensa = RECOMPENSAS_TOP[posicion]

        if (!recompensa) continue

        // Consultamos la racha del usuario calculando los estados de fecha directamente en MySQL
        const [rachaRows] = await db.execute(
            `SELECT posicion_actual, racha_dias, 
                    (ultima_fecha = CURDATE()) AS es_hoy,
                    (ultima_fecha = DATE_SUB(CURDATE(), INTERVAL 1 DAY)) AS es_ayer
             FROM top_rachas WHERE jid = ?`,
            [usuario.jid]
        )

        let rachaDias = 1

        if (rachaRows.length === 0) {
            // Primera vez que este usuario pisa el Top 3 histórico
            await db.execute(
                `INSERT INTO top_rachas (jid, posicion_actual, racha_dias, ultima_fecha) 
                 VALUES (?, ?, 1, CURDATE())`,
                [usuario.jid, posicion]
            )
            rachaDias = 1
        } else {
            const r = rachaRows[0]

            if (r.es_hoy) {
                // Si el comando se vuelve a usar hoy y el usuario cambió de puesto hoy mismo, la racha se quiebra
                if (parseInt(r.posicion_actual) !== posicion) {
                    await db.execute(
                        `UPDATE top_rachas SET posicion_actual = ?, racha_dias = 1 WHERE jid = ?`,
                        [posicion, usuario.jid]
                    )
                    rachaDias = 1
                } else {
                    rachaDias = r.racha_dias
                }
            } else if (r.es_ayer) {
                // Estuvo en el top ayer. ¿Mantuvo la misma posición exacta?
                if (parseInt(r.posicion_actual) === posicion) {
                    rachaDias = r.racha_dias + 1
                    await db.execute(
                        `UPDATE top_rachas SET racha_dias = ?, ultima_fecha = CURDATE() WHERE jid = ?`,
                        [rachaDias, usuario.jid]
                    )
                } else {
                    // Posición alterada (subió o bajó), la racha se rompe y vuelve a 1
                    rachaDias = 1
                    await db.execute(
                        `UPDATE top_rachas SET posicion_actual = ?, racha_dias = 1, ultima_fecha = CURDATE() WHERE jid = ?`,
                        [posicion, usuario.jid]
                    )
                }
            } else {
                // Pasaron más días o se cayó del top, racha expirada
                rachaDias = 1
                await db.execute(
                    `UPDATE top_rachas SET posicion_actual = ?, racha_dias = 1, ultima_fecha = CURDATE() WHERE jid = ?`,
                    [posicion, usuario.jid]
                )
            }
        }

        // Se entrega el premio cada 3 días acumulados (Día 3, Día 6, Día 9...) para premiar la constancia prolongada
        if (rachaDias % 3 === 0) {
            const yaRecibio = await yaRecibioRecompensaHoy(usuario.jid)
            if (!yaRecibio) {
                // Añadir monedas al balance general
                await db.execute(
                    'UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?',
                    [recompensa, usuario.jid]
                )

                // Registrar para bloquear doble reclamos el mismo día
                await db.execute(
                    `INSERT INTO top_recompensas (jid, posicion, monto, fecha)
                     VALUES (?, ?, ?, CURDATE())`,
                    [usuario.jid, posicion, recompensa]
                )

                // Mensaje con el formato exacto solicitado
                await sock.sendMessage(jidGrupo, {
                    text: `🎉 ¡Felicidades @${usuario.jid.split('@')[0]}!, aquí tienes tu recompensa de ${recompensa} monedas por estar en el top ${posicion} durante 3 días consecutivos! Tu racha es de ${rachaDias} días. 🏆`,
                    mentions: [usuario.jid],
                }, { quoted: mensaje })
            }
        }
    }
}

async function darInsigniasTop(sock, jidGrupo, rows) {
    for (let i = 0; i < rows.length; i++) {
        const posicion = i + 1
        const usuario = rows[i]
        const nombreInsignia = INSIGNIAS_TOP[posicion]

        if (!nombreInsignia) continue

        const [yaLaTiene] = await db.execute(
            'SELECT id FROM insignias WHERE jid = ? AND nombre = ? LIMIT 1',
            [usuario.jid, nombreInsignia]
        )

        if (yaLaTiene.length > 0) continue

        await db.execute(
            'INSERT INTO insignias (jid, nombre) VALUES (?, ?)',
            [usuario.jid, nombreInsignia]
        )

        await sock.sendMessage(jidGrupo, {
            text: `🏅 ¡@${usuario.jid.split('@')[0]} obtuvo la insignia *${nombreInsignia}*!`,
            mentions: [usuario.jid],
        })
    }
}

const top = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        await asegurarTablasTop()

        const [rows] = await db.execute(
            `SELECT jid, nombre, nivel, xp
             FROM usuarios
             ORDER BY xp DESC, nivel DESC, monedas DESC
             LIMIT 10`
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: '📊 Aún no hay usuarios registrados.' }, { quoted: mensaje })
            return
        }

        let texto = '🏆 *TOP 10 USUARIOS GLOBAL*\n\n────────────────────────────────\n\n'
        const menciones = []

        rows.forEach((usuario, i) => {
            texto += `${MEDALLAS[i]} @${usuario.jid.split('@')[0]} — Nv.${usuario.nivel || 1} (${usuario.xp || 0} XP)\n`
            menciones.push(usuario.jid)
        })

        texto += '\n────────────────────────────────\n'
        texto += '\n🎁 *Recompensa por racha Top 3:*\n'
        texto += '🥇 Top 1: 1,500 monedas\n'
        texto += '🥈 Top 2: 1,000 monedas\n'
        texto += '🥉 Top 3: 500 monedas\n'
        texto += '\n⏳ Se entrega de forma automática cada 3 días consecutivos manteniendo la misma posición exacta.'
        texto += '\n⚠️ Si subes, bajas de puesto o sales del Top 3, tu racha se reiniciará por completo.'

        await sock.sendMessage(jid, { text: texto, mentions: menciones }, { quoted: mensaje })

        await registrarTopDelDia(rows)
        await darInsigniasTop(sock, jid, rows)
        await darRecompensasTop(sock, jid, mensaje, rows)
    },
}

export default top