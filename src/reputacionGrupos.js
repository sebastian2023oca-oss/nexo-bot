// ============================================================
// REPUTACIÓN DE GRUPOS — NEXO BOT (Fase 4: Negocio y Moderación)
// ============================================================
// Cada grupo donde está el bot tiene un puntaje de reputación.
// Sube lentamente con actividad sana, baja por incidentes (spam
// detectado, reportes de un owner). Si cae bajo el umbral crítico
// Y se mantiene ahí durante un período de gracia (no de forma
// instantánea), el bot sale solo del grupo — esto es intencional:
// una caída momentánea por un pico de actividad normal NO debe
// sacar al bot; solo una reputación sostenidamente mala lo hace.
//
// Exporta:
//   - asegurarTablasReputacionGrupos()
//   - registrarIncidente(jidGrupo, tipo, motivo)
//   - registrarActividadSana(jidGrupo)
//   - obtenerReputacion(jidGrupo)
//   - evaluarSalidaAutomatica(sock, jidGrupo) → revisa y sale si corresponde
//   - verificarLimiteDiarioIngresos() / registrarIngresoGrupo()
// ============================================================

import db from './db.js'

const CONFIG = {
    PUNTAJE_INICIAL: 100,
    PUNTAJE_MAXIMO: 150,

    // Penalizaciones por tipo de incidente
    PENALIZACION_SPAM_INTERNO: -8,      // disparado automáticamente por antibaneo.js
    PENALIZACION_REPORTE_OWNER: -25,    // un owner marca el grupo manualmente

    // Recompensa lenta por buen comportamiento sostenido
    RECOMPENSA_ACTIVIDAD_SANA: 1,
    RECOMPENSA_COOLDOWN_MS: 6 * 3600_000, // máx 1 vez cada 6h por grupo

    // Umbral crítico y período de gracia antes de salir
    UMBRAL_CRITICO: 20,
    PERIODO_GRACIA_MS: 24 * 3600_000, // 24h por debajo del umbral antes de salir

    // Límite diario de grupos nuevos aceptados (negocio, no relacionado
    // con la rampa de activación de la Fase 3 — este es permanente)
    LIMITE_INGRESOS_DIARIOS: 10,
}

const cooldownRecompensa = new Map() // jidGrupo -> timestamp última recompensa

export async function asegurarTablasReputacionGrupos() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS reputacion_grupos (
            jid             VARCHAR(60) PRIMARY KEY,
            nombre          VARCHAR(120) DEFAULT NULL,
            puntaje         INT NOT NULL DEFAULT 100,
            incidentes      INT NOT NULL DEFAULT 0,
            en_periodo_gracia TINYINT DEFAULT 0,
            gracia_desde    DATETIME DEFAULT NULL,
            actualizado_en  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS ingresos_grupos_diarios (
            id      INT AUTO_INCREMENT PRIMARY KEY,
            fecha   DATE NOT NULL UNIQUE,
            cantidad INT NOT NULL DEFAULT 0
        )
    `)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS reputacion_grupos_historial (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            jid_grupo   VARCHAR(60) NOT NULL,
            tipo        VARCHAR(40) NOT NULL,
            delta       INT NOT NULL,
            motivo      VARCHAR(200),
            fecha       DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)
}

async function asegurarFilaGrupo(jidGrupo, nombre = null) {
    await db.execute(
        'INSERT IGNORE INTO reputacion_grupos (jid, nombre, puntaje) VALUES (?, ?, ?)',
        [jidGrupo, nombre, CONFIG.PUNTAJE_INICIAL]
    )
}

async function aplicarDelta(jidGrupo, delta, tipo, motivo) {
    await asegurarFilaGrupo(jidGrupo)

    await db.execute(
        `UPDATE reputacion_grupos
         SET puntaje = GREATEST(0, LEAST(?, puntaje + ?)),
             incidentes = incidentes + ?
         WHERE jid = ?`,
        [CONFIG.PUNTAJE_MAXIMO, delta, delta < 0 ? 1 : 0, jidGrupo]
    )

    await db.execute(
        'INSERT INTO reputacion_grupos_historial (jid_grupo, tipo, delta, motivo) VALUES (?, ?, ?, ?)',
        [jidGrupo, tipo, delta, motivo || null]
    )
}

// ---------- REGISTRO DE INCIDENTES ----------
/**
 * Llamar desde handler.js cuando antibaneo.js detecta spam interno
 * dentro de un grupo (no en privado, los privados no tienen reputación).
 */
export async function registrarIncidente(jidGrupo, tipo = 'spam_interno', motivo = null) {
    const delta = tipo === 'reporte_owner'
        ? CONFIG.PENALIZACION_REPORTE_OWNER
        : CONFIG.PENALIZACION_SPAM_INTERNO

    await aplicarDelta(jidGrupo, delta, tipo, motivo)
}

// ---------- RECOMPENSA POR ACTIVIDAD SANA ----------
/**
 * Llamar ocasionalmente (no en cada mensaje) cuando un grupo tiene
 * actividad normal sin incidentes. Tiene su propio cooldown interno
 * para no recalcular esto en cada comando — basta con llamarla desde
 * autoRegistrar.js o similar, el cooldown se encarga del resto.
 */
export async function registrarActividadSana(jidGrupo) {
    const ahora = Date.now()
    const ultima = cooldownRecompensa.get(jidGrupo) || 0
    if (ahora - ultima < CONFIG.RECOMPENSA_COOLDOWN_MS) return

    cooldownRecompensa.set(jidGrupo, ahora)
    await aplicarDelta(jidGrupo, CONFIG.RECOMPENSA_ACTIVIDAD_SANA, 'actividad_sana', null)
}

// ---------- CONSULTA ----------
export async function obtenerReputacion(jidGrupo) {
    await asegurarFilaGrupo(jidGrupo)
    const [rows] = await db.execute('SELECT * FROM reputacion_grupos WHERE jid = ?', [jidGrupo])
    return rows[0]
}

// ---------- EVALUACIÓN DE SALIDA AUTOMÁTICA ----------
/**
 * Debe llamarse periódicamente (ej. cada 30-60 min desde un setInterval
 * en handler.js o index.js), NO en cada mensaje — es una operación de
 * mantenimiento, no de tiempo real.
 *
 * Lógica:
 *  - Si puntaje >= UMBRAL_CRITICO: limpia cualquier período de gracia
 *    que estuviera en curso (el grupo se "salvó").
 *  - Si puntaje < UMBRAL_CRITICO y NO está en gracia: inicia el período
 *    de gracia (marca timestamp) pero NO sale todavía.
 *  - Si puntaje < UMBRAL_CRITICO y SÍ está en gracia y ya pasó el
 *    PERIODO_GRACIA_MS: el bot sale del grupo y notifica a los owners.
 */
export async function evaluarSalidaAutomatica(sock, jidGrupo, ownersJid = null) {
    const rep = await obtenerReputacion(jidGrupo)
    const ahora = Date.now()

    if (rep.puntaje >= CONFIG.UMBRAL_CRITICO) {
        if (rep.en_periodo_gracia) {
            await db.execute(
                'UPDATE reputacion_grupos SET en_periodo_gracia = 0, gracia_desde = NULL WHERE jid = ?',
                [jidGrupo]
            )
            // Aviso de "se salvó": útil para que los owners sepan que la
            // situación se normalizó sin que ellos hicieran nada.
            if (ownersJid) {
                try {
                    await sock.sendMessage(ownersJid, {
                        text: `✅ *GRUPO RECUPERADO*\n\n📍 *Grupo:* ${rep.nombre || jidGrupo}\n📈 *Puntaje actual:* ${rep.puntaje}/${CONFIG.PUNTAJE_MAXIMO}\n\nSalió del período de gracia — la reputación se recuperó por encima del umbral crítico.`
                    })
                } catch {}
            }
        }
        return { accion: 'ninguna', motivo: 'reputacion_ok' }
    }

    // Puntaje por debajo del umbral crítico
    if (!rep.en_periodo_gracia) {
        await db.execute(
            'UPDATE reputacion_grupos SET en_periodo_gracia = 1, gracia_desde = NOW() WHERE jid = ?',
            [jidGrupo]
        )

        // ── AVISO INMEDIATO A OWNERS ──────────────────────────────────
        // Este es el momento en que de verdad importa que un humano se
        // entere: el grupo todavía NO va a ser expulsado (faltan hasta
        // 24h de gracia), así que hay tiempo de revisar manualmente con
        // .repgrupo o intervenir en el grupo antes de que el bot actúe.
        if (ownersJid) {
            try {
                await sock.sendMessage(ownersJid, {
                    text: `⚠️ *ALERTA DE REPUTACIÓN — PERÍODO DE GRACIA INICIADO*\n\n` +
                          `📍 *Grupo:* ${rep.nombre || jidGrupo}\n` +
                          `📉 *Puntaje:* ${rep.puntaje}/${CONFIG.PUNTAJE_MAXIMO} (umbral crítico: ${CONFIG.UMBRAL_CRITICO})\n` +
                          `⚠️ *Incidentes registrados:* ${rep.incidentes}\n\n` +
                          `El bot NO saldrá todavía — tienes *${(CONFIG.PERIODO_GRACIA_MS / 3600_000).toFixed(0)}h* para revisar el grupo o intervenir manualmente.\n\n` +
                          `💡 Usa *.repgrupo* dentro del grupo para ver el detalle, o espera a que se recupere solo si fue un pico pasajero.`
                })
            } catch {}
        }
        // ──────────────────────────────────────────────────────────────

        return { accion: 'periodo_gracia_iniciado', motivo: `Puntaje ${rep.puntaje} bajo el umbral ${CONFIG.UMBRAL_CRITICO}` }
    }

    const graciaTranscurrida = ahora - new Date(rep.gracia_desde).getTime()
    if (graciaTranscurrida < CONFIG.PERIODO_GRACIA_MS) {
        const horasRestantes = ((CONFIG.PERIODO_GRACIA_MS - graciaTranscurrida) / 3600_000).toFixed(1)
        return { accion: 'en_gracia', motivo: `Quedan ${horasRestantes}h de gracia antes de evaluar salida` }
    }

    // Se agotó el período de gracia con el puntaje aún bajo: salir
    try {
        await sock.groupLeave(jidGrupo)
    } catch (err) {
        return { accion: 'error_salida', motivo: err.message }
    }

    if (ownersJid) {
        try {
            await sock.sendMessage(ownersJid, {
                text: `🚪 *SALIDA AUTOMÁTICA POR REPUTACIÓN*\n\n` +
                      `📍 *Grupo:* ${rep.nombre || jidGrupo}\n` +
                      `📉 *Puntaje final:* ${rep.puntaje}/${CONFIG.PUNTAJE_MAXIMO}\n` +
                      `⚠️ *Incidentes registrados:* ${rep.incidentes}\n\n` +
                      `El bot salió de este grupo automáticamente tras mantenerse bajo el umbral crítico (${CONFIG.UMBRAL_CRITICO}) durante ${(CONFIG.PERIODO_GRACIA_MS / 3600_000).toFixed(0)}h continuas.`
            })
        } catch {}
    }

    return { accion: 'salida_ejecutada', motivo: 'Reputación crítica sostenida' }
}

/**
 * Recorre todos los grupos con reputación registrada y evalúa salida
 * automática en cada uno. Pensado para un setInterval poco frecuente.
 */
export async function evaluarTodosLosGrupos(sock, ownersJid = null) {
    // Se evalúan dos casos: grupos actualmente bajo el umbral crítico
    // (para iniciar gracia o ejecutar salida), Y grupos que están en
    // período de gracia aunque su puntaje ya se haya recuperado (para
    // poder avisar "se salvó" y limpiar el estado de gracia).
    const [grupos] = await db.execute(
        'SELECT jid FROM reputacion_grupos WHERE puntaje < ? OR en_periodo_gracia = 1',
        [CONFIG.UMBRAL_CRITICO]
    )

    const resultados = []
    for (const g of grupos) {
        const resultado = await evaluarSalidaAutomatica(sock, g.jid, ownersJid)
        resultados.push({ jid: g.jid, ...resultado })
    }
    return resultados
}

// ---------- LÍMITE DIARIO DE INGRESOS A GRUPOS ----------
function fechaHoy() {
    return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

export async function verificarLimiteDiarioIngresos() {
    const hoy = fechaHoy()
    const [rows] = await db.execute('SELECT cantidad FROM ingresos_grupos_diarios WHERE fecha = ?', [hoy])
    const actual = rows[0]?.cantidad || 0

    return {
        permitido: actual < CONFIG.LIMITE_INGRESOS_DIARIOS,
        actual,
        limite: CONFIG.LIMITE_INGRESOS_DIARIOS,
    }
}

export async function registrarIngresoGrupo() {
    const hoy = fechaHoy()
    await db.execute(
        `INSERT INTO ingresos_grupos_diarios (fecha, cantidad) VALUES (?, 1)
         ON DUPLICATE KEY UPDATE cantidad = cantidad + 1`,
        [hoy]
    )
}

export default {
    asegurarTablasReputacionGrupos,
    registrarIncidente,
    registrarActividadSana,
    obtenerReputacion,
    evaluarSalidaAutomatica,
    evaluarTodosLosGrupos,
    verificarLimiteDiarioIngresos,
    registrarIngresoGrupo,
}
