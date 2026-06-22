import db from './db.js'

// Asegura todas las tablas nuevas del sistema de casino/apuestas (menú 5)
export async function asegurarTablasCasino() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_stats (
            jid              VARCHAR(60) PRIMARY KEY,
            total_apostado   BIGINT DEFAULT 0,
            total_ganado     BIGINT DEFAULT 0,
            total_perdido    BIGINT DEFAULT 0,
            victorias        INT DEFAULT 0,
            derrotas         INT DEFAULT 0,
            racha_actual     INT DEFAULT 0,
            mejor_racha      INT DEFAULT 0
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_historial (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            jid       VARCHAR(60) NOT NULL,
            juego     VARCHAR(40) NOT NULL,
            cantidad  INT NOT NULL,
            resultado ENUM('gano','perdio','empate') NOT NULL,
            fecha     DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_retos (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            jid_retador     VARCHAR(60) NOT NULL,
            jid_retado      VARCHAR(60) NOT NULL,
            cantidad        INT NOT NULL,
            tipo            VARCHAR(30) DEFAULT 'retar',
            estado          ENUM('pendiente','aceptado','rechazado','cancelado') DEFAULT 'pendiente',
            grupo_jid       VARCHAR(60) NOT NULL,
            fecha           DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_jackpot (
            id      INT PRIMARY KEY DEFAULT 1,
            pozo    BIGINT DEFAULT 0
        )
    `)
    await db.execute(`INSERT IGNORE INTO casino_jackpot (id, pozo) VALUES (1, 0)`)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_pozo_mundial (
            id      INT PRIMARY KEY DEFAULT 1,
            pozo    BIGINT DEFAULT 0
        )
    `)
    await db.execute(`INSERT IGNORE INTO casino_pozo_mundial (id, pozo) VALUES (1, 0)`)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_subastas (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            grupo_jid   VARCHAR(60) NOT NULL,
            jid_mejor   VARCHAR(60),
            monto_mejor INT DEFAULT 0,
            activa      TINYINT DEFAULT 1,
            creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
            cierra_en   DATETIME NOT NULL
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_apuestas_grupales (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            grupo_jid   VARCHAR(60) NOT NULL,
            cantidad    INT NOT NULL,
            activa      TINYINT DEFAULT 1,
            creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
            cierra_en   DATETIME NOT NULL
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_apuestas_grupales_jugadores (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            apuesta_id  INT NOT NULL,
            jid         VARCHAR(60) NOT NULL,
            UNIQUE KEY unico_jugador (apuesta_id, jid)
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_torneos (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            grupo_jid   VARCHAR(60) NOT NULL,
            cantidad    INT NOT NULL,
            estado      ENUM('inscripcion','en_curso','finalizado') DEFAULT 'inscripcion',
            creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
            cierra_en   DATETIME NOT NULL
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_torneos_jugadores (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            torneo_id   INT NOT NULL,
            jid         VARCHAR(60) NOT NULL,
            eliminado   TINYINT DEFAULT 0,
            UNIQUE KEY unico_torneo_jugador (torneo_id, jid)
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_rey (
            id           INT PRIMARY KEY DEFAULT 1,
            jid_rey      VARCHAR(60),
            defensas     INT DEFAULT 0,
            actualizado  DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)
    await db.execute(`INSERT IGNORE INTO casino_rey (id) VALUES (1)`)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_caceria (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            jid_objetivo VARCHAR(60) NOT NULL,
            jid_creador  VARCHAR(60) NOT NULL,
            cantidad     INT NOT NULL,
            grupo_jid    VARCHAR(60) NOT NULL,
            activa       TINYINT DEFAULT 1,
            creado_en    DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_ultimohombre (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            grupo_jid   VARCHAR(60) NOT NULL,
            cantidad    INT NOT NULL,
            estado      ENUM('inscripcion','en_curso','finalizado') DEFAULT 'inscripcion',
            creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
            cierra_en   DATETIME NOT NULL
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_ultimohombre_jugadores (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            partida_id    INT NOT NULL,
            jid           VARCHAR(60) NOT NULL,
            eliminado     TINYINT DEFAULT 0,
            UNIQUE KEY unico_partida_jugador (partida_id, jid)
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_guerra (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            grupo_jid   VARCHAR(60) NOT NULL,
            cantidad    INT NOT NULL,
            estado      ENUM('inscripcion','en_curso','finalizado') DEFAULT 'inscripcion',
            creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
            cierra_en   DATETIME NOT NULL
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS casino_guerra_jugadores (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            guerra_id   INT NOT NULL,
            jid         VARCHAR(60) NOT NULL,
            eliminado   TINYINT DEFAULT 0,
            UNIQUE KEY unico_guerra_jugador (guerra_id, jid)
        )
    `)
}

// Registra el resultado de una jugada en casino_stats + casino_historial
export async function registrarJugadaCasino(jid, juego, cantidadApostada, resultado, gananciaNeta) {
    const [rows] = await db.execute('SELECT * FROM casino_stats WHERE jid = ?', [jid])

    if (rows.length === 0) {
        await db.execute('INSERT INTO casino_stats (jid) VALUES (?)', [jid])
    }

    await db.execute('UPDATE casino_stats SET total_apostado = total_apostado + ? WHERE jid = ?', [cantidadApostada, jid])

    if (resultado === 'gano') {
        await db.execute(
            'UPDATE casino_stats SET total_ganado = total_ganado + ?, victorias = victorias + 1, racha_actual = racha_actual + 1 WHERE jid = ?',
            [Math.max(0, gananciaNeta), jid]
        )
        const [u] = await db.execute('SELECT racha_actual, mejor_racha FROM casino_stats WHERE jid = ?', [jid])
        if (u[0].racha_actual > u[0].mejor_racha) {
            await db.execute('UPDATE casino_stats SET mejor_racha = ? WHERE jid = ?', [u[0].racha_actual, jid])
        }
    } else if (resultado === 'perdio') {
        await db.execute(
            'UPDATE casino_stats SET total_perdido = total_perdido + ?, derrotas = derrotas + 1, racha_actual = 0 WHERE jid = ?',
            [Math.abs(gananciaNeta), jid]
        )
    }

    await db.execute(
        'INSERT INTO casino_historial (jid, juego, cantidad, resultado) VALUES (?, ?, ?, ?)',
        [jid, juego, cantidadApostada, resultado]
    )
}

export default { asegurarTablasCasino, registrarJugadaCasino }
