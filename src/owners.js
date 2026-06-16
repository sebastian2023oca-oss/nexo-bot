import db from './db.js'

export const OWNER_PRINCIPAL = '122218159816809@lid2'

// Verifica si un JID es owner
export async function esOwner(jid) {
    if (jid === OWNER_PRINCIPAL) return true
    const [rows] = await db.execute('SELECT id FROM owners WHERE jid = ?', [jid])
    return rows.length > 0
}

// Asegura que la tabla owners exista y el owner principal esté siempre
export async function inicializarOwners() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS owners (
            id    INT AUTO_INCREMENT PRIMARY KEY,
            jid   VARCHAR(60) NOT NULL UNIQUE,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)
    // Owner principal siempre presente
    await db.execute(
        'INSERT IGNORE INTO owners (jid) VALUES (?)',
        [OWNER_PRINCIPAL]
    )

    // Tablas adicionales para el sistema owners
    await db.execute(`
        CREATE TABLE IF NOT EXISTS usuarios_baneados (
            id     INT AUTO_INCREMENT PRIMARY KEY,
            jid    VARCHAR(60) NOT NULL UNIQUE,
            motivo TEXT,
            fecha  DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS usuarios_muteados (
            id    INT AUTO_INCREMENT PRIMARY KEY,
            jid   VARCHAR(60) NOT NULL UNIQUE,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS codigos_canjeables (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            codigo    VARCHAR(30) NOT NULL UNIQUE,
            nombre    VARCHAR(80),
            cantidad  INT NOT NULL,
            usos_max  INT NOT NULL,
            usos_usados INT DEFAULT 0,
            activo    TINYINT DEFAULT 1,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await db.execute(`
        CREATE TABLE IF NOT EXISTS codigos_usados (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            codigo_id INT NOT NULL,
            jid       VARCHAR(60) NOT NULL,
            fecha     DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unico_uso (codigo_id, jid)
        )
    `)

    // Columnas VIP extendidas en usuarios (si no existen)
    try {
        await db.execute(`ALTER TABLE usuarios ADD COLUMN vip_tipo VARCHAR(20) DEFAULT NULL`)
    } catch {}
    try {
        await db.execute(`ALTER TABLE usuarios ADD COLUMN neg_tipo VARCHAR(20) DEFAULT NULL`)
    } catch {}
}

export default { esOwner, inicializarOwners, OWNER_PRINCIPAL }
