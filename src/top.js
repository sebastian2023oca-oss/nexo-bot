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

async function columnaExiste(tabla, columna) {
    const [rows] = await db.execute(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?
         LIMIT 1`,
        [tabla, columna]
    )

    return rows.length > 0
}

async function agregarColumnaSiNoExiste(tabla, columna, definicion) {
    const existe = await columnaExiste(tabla, columna)
    if (existe) return

    await db.execute(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`)
}

async function ejecutarSinRomper(sql) {
    try {
        await db.execute(sql)
    } catch (error) {
        console.warn('⚠️ Aviso en migración de top:', error.message)
    }
}

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

    await agregarColumnaSiNoExiste('top_historial', 'jid', 'VARCHAR(60) NOT NULL')
    await agregarColumnaSiNoExiste('top_historial', 'posicion', 'INT NOT NULL DEFAULT 0')
    await agregarColumnaSiNoExiste('top_historial', 'fecha', 'DATE NULL')
    await agregarColumnaSiNoExiste('top_historial', 'creado_en', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP')

    await agregarColumnaSiNoExiste('top_recompensas', 'jid', 'VARCHAR(60) NOT NULL')
    await agregarColumnaSiNoExiste('top_recompensas', 'posicion', 'INT NOT NULL DEFAULT 0')
    await agregarColumnaSiNoExiste('top_recompensas', 'monto', 'INT NOT NULL DEFAULT 0')
    await agregarColumnaSiNoExiste('top_recompensas', 'fecha', 'DATE NULL')
    await agregarColumnaSiNoExiste('top_recompensas', 'creado_en', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP')

    await ejecutarSinRomper('CREATE INDEX idx_top_historial_jid_pos_fecha ON top_historial (jid, posicion, fecha)')
    await ejecutarSinRomper('CREATE INDEX idx_top_recompensas_jid_fecha ON top_recompensas (jid, fecha)')
}

async function registrarTopDelDia(rows) {
    // El Top del día debe representar el estado actual.
    // Si alguien baja de Top 1 a Top 2, o sale del Top 3, se elimina su registro anterior de hoy.
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

async function obtenerDiasConsecutivosEnMismaPosicion(jid, posicion) {
    const [rows] = await db.execute(
        `SELECT COUNT(DISTINCT fecha) AS dias
         FROM top_historial
         WHERE jid = ?
           AND posicion = ?
           AND fecha IN (
               CURDATE(),
               DATE_SUB(CURDATE(), INTERVAL 1 DAY),
               DATE_SUB(CURDATE(), INTERVAL 2 DAY)
           )`,
        [jid, posicion]
    )

    return Number(rows[0]?.dias || 0)
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

        const diasConsecutivos = await obtenerDiasConsecutivosEnMismaPosicion(usuario.jid, posicion)

        if (diasConsecutivos < 3) continue

        const yaRecibio = await yaRecibioRecompensaHoy(usuario.jid)
        if (yaRecibio) continue

        await db.execute(
            'UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?',
            [recompensa, usuario.jid]
        )

        await db.execute(
            `INSERT INTO top_recompensas (jid, posicion, monto, fecha)
             VALUES (?, ?, ?, CURDATE())`,
            [usuario.jid, posicion, recompensa]
        )

        await sock.sendMessage(jidGrupo, {
            text: `🎁 @${usuario.jid.split('@')[0]}, toma tu recompensa diaria por estar entre los mejores globalmente.\n\n🏆 *Top:* ${posicion}\n🔥 *Racha:* 3 días consecutivos en el Top ${posicion}\n💰 *Dinero obtenido:* ${recompensa} monedas`,
            mentions: [usuario.jid],
        }, { quoted: mensaje })
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

        let texto = '🏆 *TOP 10 USUARIOS*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
        const menciones = []

        rows.forEach((usuario, i) => {
            texto += `${MEDALLAS[i]} @${usuario.jid.split('@')[0]} — Nv.${usuario.nivel || 1} (${usuario.xp || 0} XP)\n`
            menciones.push(usuario.jid)
        })

        texto += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
        texto += '\n🎁 *Recompensa diaria Top 3:*\n'
        texto += '🥇 Top 1: 1500 monedas\n'
        texto += '🥈 Top 2: 1000 monedas\n'
        texto += '🥉 Top 3: 500 monedas\n'
        texto += '\n⏳ Se entrega al completar 3 días consecutivos en la misma posición.'
        texto += '\n⚠️ Si cambia de posición o sale del Top 3, la racha se reinicia.'

        await sock.sendMessage(jid, { text: texto, mentions: menciones }, { quoted: mensaje })

        await registrarTopDelDia(rows)
        await darInsigniasTop(sock, jid, rows)
        await darRecompensasTop(sock, jid, mensaje, rows)
    },
}

export default top
