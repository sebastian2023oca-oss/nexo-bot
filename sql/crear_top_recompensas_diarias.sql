CREATE TABLE IF NOT EXISTS top_historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jid VARCHAR(60) NOT NULL,
    posicion INT NOT NULL,
    fecha DATE NOT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS top_recompensas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jid VARCHAR(60) NOT NULL,
    posicion INT NOT NULL,
    monto INT NOT NULL DEFAULT 0,
    fecha DATE NOT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP PROCEDURE IF EXISTS add_column_if_missing;

DELIMITER //
CREATE PROCEDURE add_column_if_missing(
    IN tabla_nombre VARCHAR(64),
    IN columna_nombre VARCHAR(64),
    IN columna_definicion TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = tabla_nombre
          AND COLUMN_NAME = columna_nombre
    ) THEN
        SET @sql_add_column = CONCAT('ALTER TABLE `', tabla_nombre, '` ADD COLUMN `', columna_nombre, '` ', columna_definicion);
        PREPARE stmt_add_column FROM @sql_add_column;
        EXECUTE stmt_add_column;
        DEALLOCATE PREPARE stmt_add_column;
    END IF;
END //
DELIMITER ;

CALL add_column_if_missing('top_historial', 'jid', 'VARCHAR(60) NOT NULL');
CALL add_column_if_missing('top_historial', 'posicion', 'INT NOT NULL DEFAULT 0');
CALL add_column_if_missing('top_historial', 'fecha', 'DATE NULL');
CALL add_column_if_missing('top_historial', 'creado_en', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');

CALL add_column_if_missing('top_recompensas', 'jid', 'VARCHAR(60) NOT NULL');
CALL add_column_if_missing('top_recompensas', 'posicion', 'INT NOT NULL DEFAULT 0');
CALL add_column_if_missing('top_recompensas', 'monto', 'INT NOT NULL DEFAULT 0');
CALL add_column_if_missing('top_recompensas', 'fecha', 'DATE NULL');
CALL add_column_if_missing('top_recompensas', 'creado_en', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');

DROP PROCEDURE IF EXISTS add_column_if_missing;

DELETE h1
FROM top_historial h1
INNER JOIN top_historial h2
    ON h1.jid = h2.jid
   AND h1.fecha = h2.fecha
   AND h1.id < h2.id;

DELETE r1
FROM top_recompensas r1
INNER JOIN top_recompensas r2
    ON r1.jid = r2.jid
   AND r1.fecha = r2.fecha
   AND r1.id < r2.id;

DROP PROCEDURE IF EXISTS add_index_if_missing;

DELIMITER //
CREATE PROCEDURE add_index_if_missing(
    IN tabla_nombre VARCHAR(64),
    IN indice_nombre VARCHAR(64),
    IN indice_sql TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = tabla_nombre
          AND INDEX_NAME = indice_nombre
    ) THEN
        SET @sql_add_index = indice_sql;
        PREPARE stmt_add_index FROM @sql_add_index;
        EXECUTE stmt_add_index;
        DEALLOCATE PREPARE stmt_add_index;
    END IF;
END //
DELIMITER ;

CALL add_index_if_missing('top_historial', 'idx_top_historial_pos_fecha', 'CREATE INDEX idx_top_historial_pos_fecha ON top_historial (posicion, fecha)');
CALL add_index_if_missing('top_historial', 'uniq_top_historial_jid_fecha', 'CREATE UNIQUE INDEX uniq_top_historial_jid_fecha ON top_historial (jid, fecha)');
CALL add_index_if_missing('top_recompensas', 'idx_top_recompensas_fecha', 'CREATE INDEX idx_top_recompensas_fecha ON top_recompensas (fecha)');
CALL add_index_if_missing('top_recompensas', 'uniq_top_recompensas_jid_fecha', 'CREATE UNIQUE INDEX uniq_top_recompensas_jid_fecha ON top_recompensas (jid, fecha)');

DROP PROCEDURE IF EXISTS add_index_if_missing;
