-- ============================================================
-- TABLAS NUEVAS — FASE 4 (Reputación de Grupos, Límite Diario)
-- ============================================================
-- Se crean automáticamente al arrancar (reputacionGrupos.js las
-- asegura con CREATE TABLE IF NOT EXISTS). Este archivo es solo
-- para referencia / inspección manual.

CREATE TABLE IF NOT EXISTS reputacion_grupos (
    jid             VARCHAR(60) PRIMARY KEY,
    nombre          VARCHAR(120) DEFAULT NULL,
    puntaje         INT NOT NULL DEFAULT 100,
    incidentes      INT NOT NULL DEFAULT 0,
    en_periodo_gracia TINYINT DEFAULT 0,
    gracia_desde    DATETIME DEFAULT NULL,
    actualizado_en  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingresos_grupos_diarios (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    fecha   DATE NOT NULL UNIQUE,
    cantidad INT NOT NULL DEFAULT 0
);

-- Histórico de incidentes de reputación, para auditar por qué bajó un grupo
CREATE TABLE IF NOT EXISTS reputacion_grupos_historial (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    jid_grupo   VARCHAR(60) NOT NULL,
    tipo        VARCHAR(40) NOT NULL,
    delta       INT NOT NULL,
    motivo      VARCHAR(200),
    fecha       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rephist_jid ON reputacion_grupos_historial (jid_grupo);
