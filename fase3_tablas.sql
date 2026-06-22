-- ============================================================
-- TABLAS NUEVAS — FASE 3 (Monitoreo, Ops, Modo Mantenimiento)
-- ============================================================
-- Ejecutar una sola vez en la base de datos 'nexobot'.
-- También se crean automáticamente al arrancar el bot (ops.js y
-- mantenimiento.js las aseguran con CREATE TABLE IF NOT EXISTS),
-- así que este archivo es solo para referencia / inspección manual.

CREATE TABLE IF NOT EXISTS logs_errores (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    comando     VARCHAR(60),
    jid         VARCHAR(60),
    chat_jid    VARCHAR(60),
    mensaje_error TEXT,
    stack       TEXT,
    fecha       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs_actividad (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    tipo        ENUM('comando', 'mensaje', 'conexion', 'desconexion') NOT NULL,
    jid         VARCHAR(60),
    chat_jid    VARCHAR(60),
    detalle     VARCHAR(120),
    fecha       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Configuración global del bot: mantenimiento, modo emergencia,
-- y estado de la rampa de activación gradual tras reconectar.
CREATE TABLE IF NOT EXISTS bot_config (
    id                  INT PRIMARY KEY DEFAULT 1,
    mantenimiento       TINYINT DEFAULT 0,
    mantenimiento_motivo VARCHAR(200) DEFAULT NULL,
    emergencia          TINYINT DEFAULT 0,
    rampa_activa        TINYINT DEFAULT 0,
    rampa_inicio        DATETIME DEFAULT NULL,
    rampa_nivel         INT DEFAULT 0,
    apagado_seguro      TINYINT DEFAULT 0
);

INSERT IGNORE INTO bot_config (id) VALUES (1);

-- Índices para que los logs no se vuelvan lentos de consultar con el tiempo
CREATE INDEX IF NOT EXISTS idx_logs_errores_fecha ON logs_errores (fecha);
CREATE INDEX IF NOT EXISTS idx_logs_actividad_fecha ON logs_actividad (fecha);
CREATE INDEX IF NOT EXISTS idx_logs_actividad_chat ON logs_actividad (chat_jid);
