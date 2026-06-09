import mysql from 'mysql2/promise'

const db = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'nexo123',
    database: 'nexobot',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
})

// Verificar conexión
try {
    const conn = await db.getConnection()
    console.log('✅ Conectado a MySQL - nexobot')
    conn.release()
} catch (err) {
    console.error('❌ Error al conectar a MySQL:', err.message)
    process.exit(1)
}

// Crear tablas si no existen
await db.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        jid         VARCHAR(60) NOT NULL UNIQUE,
        nombre      VARCHAR(80),
        nivel       INT DEFAULT 1,
        xp          INT DEFAULT 0,
        monedas     INT DEFAULT 0,
        banco       INT DEFAULT 0,
        vip         TINYINT DEFAULT 0,
        vip_expira  DATETIME DEFAULT NULL,
        negocio     TINYINT DEFAULT 0,
        neg_expira  DATETIME DEFAULT NULL,
        adulto      TINYINT DEFAULT 0,
        creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`)

await db.execute(`
    CREATE TABLE IF NOT EXISTS inventario (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        jid         VARCHAR(60) NOT NULL,
        item        VARCHAR(80) NOT NULL,
        cantidad    INT DEFAULT 1,
        FOREIGN KEY (jid) REFERENCES usuarios(jid) ON DELETE CASCADE
    )
`)

await db.execute(`
    CREATE TABLE IF NOT EXISTS warns (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        jid         VARCHAR(60) NOT NULL,
        grupo       VARCHAR(60) NOT NULL,
        razon       VARCHAR(200),
        fecha       DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`)

await db.execute(`
    CREATE TABLE IF NOT EXISTS solicitudes (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        jid         VARCHAR(60) NOT NULL,
        nombre      VARCHAR(80),
        link        TEXT NOT NULL,
        estado      ENUM('pendiente', 'aceptada', 'rechazada') DEFAULT 'pendiente',
        fecha       DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`)

export default db