// ============================================================
// MANTENIMIENTO — NEXO BOT (Fase 3: Control de Flujo y Rampa)
// ============================================================
// Controla CUATRO estados que pueden detener o limitar el
// procesamiento de mensajes:
//
//   1. Mantenimiento global  → nadie (excepto owners) usa el bot
//   2. Emergencia            → mantenimiento activado por un owner
//                               al instante, para parar todo ya
//   3. Apagado seguro        → deja de aceptar comandos NUEVOS,
//                               espera a que la cola de envío se
//                               vacíe, y solo entonces se puede
//                               apagar el proceso sin perder nada
//   4. Rampa de activación   → tras reconectar (especialmente con
//      gradual                el MISMO número que ya fue baneado),
//                               limita cuántos GRUPOS DISTINTOS se
//                               atienden por hora, subiendo el
//                               límite progresivamente. Esto evita
//                               que el número reconectado dispare
//                               cientos de mensajes simultáneos en
//                               minuto 1, que es exactamente el
//                               patrón que WhatsApp asocia a bots.
//
// Todo el estado vive en bot_config (MySQL) para que sobreviva un
// `pm2 restart`, y se cachea en memoria por unos segundos para no
// pegarle a la BD en cada mensaje.
// ============================================================

import db from './db.js'

const CONFIG = {
    CACHE_ESTADO_MS: 5_000, // refresca el estado de bot_config cada 5s

    // Rampa de activación: niveles progresivos de grupos distintos
    // permitidos POR HORA desde que se activa la rampa. Empieza muy
    // bajo a propósito — es la fase más sensible tras un ban previo.
    RAMPA_NIVELES: [
        { horas: 0, maxGruposPorHora: 3 },   // primera hora: solo 3 grupos
        { horas: 1, maxGruposPorHora: 8 },
        { horas: 3, maxGruposPorHora: 20 },
        { horas: 6, maxGruposPorHora: 50 },
        { horas: 12, maxGruposPorHora: 120 },
        { horas: 24, maxGruposPorHora: Infinity }, // tras 24h, sin límite de rampa
    ],
}

let estadoCache = null
let estadoCacheExpira = 0

export async function asegurarTablaConfig() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS bot_config (
            id                  INT PRIMARY KEY DEFAULT 1,
            mantenimiento       TINYINT DEFAULT 0,
            mantenimiento_motivo VARCHAR(200) DEFAULT NULL,
            emergencia          TINYINT DEFAULT 0,
            rampa_activa        TINYINT DEFAULT 0,
            rampa_inicio        DATETIME DEFAULT NULL,
            rampa_nivel         INT DEFAULT 0,
            apagado_seguro      TINYINT DEFAULT 0
        )
    `)
    await db.execute('INSERT IGNORE INTO bot_config (id) VALUES (1)')
}

async function leerConfig() {
    const ahora = Date.now()
    if (estadoCache && ahora < estadoCacheExpira) return estadoCache

    const [rows] = await db.execute('SELECT * FROM bot_config WHERE id = 1')
    estadoCache = rows[0] || {}
    estadoCacheExpira = ahora + CONFIG.CACHE_ESTADO_MS
    return estadoCache
}

function invalidarCacheConfig() {
    estadoCache = null
    estadoCacheExpira = 0
}

// ---------- MODO MANTENIMIENTO ----------
export async function activarMantenimiento(motivo = 'Mantenimiento programado') {
    await db.execute(
        'UPDATE bot_config SET mantenimiento = 1, mantenimiento_motivo = ? WHERE id = 1',
        [motivo]
    )
    invalidarCacheConfig()
}

export async function desactivarMantenimiento() {
    await db.execute(
        'UPDATE bot_config SET mantenimiento = 0, mantenimiento_motivo = NULL WHERE id = 1'
    )
    invalidarCacheConfig()
}

export async function estaEnMantenimiento() {
    const c = await leerConfig()
    return { activo: !!c.mantenimiento, motivo: c.mantenimiento_motivo }
}

// ---------- MODO EMERGENCIA (owner) ----------
/**
 * Activa mantenimiento INSTANTÁNEAMENTE (sin esperar el TTL de caché
 * normal) y marca emergencia=1 para diferenciarlo de un mantenimiento
 * programado en los logs/paneles.
 */
export async function activarEmergencia(motivo = 'Activado manualmente por un owner') {
    await db.execute(
        'UPDATE bot_config SET mantenimiento = 1, emergencia = 1, mantenimiento_motivo = ? WHERE id = 1',
        [motivo]
    )
    invalidarCacheConfig()
}

export async function desactivarEmergencia() {
    await db.execute(
        'UPDATE bot_config SET mantenimiento = 0, emergencia = 0, mantenimiento_motivo = NULL WHERE id = 1'
    )
    invalidarCacheConfig()
}

// ---------- APAGADO SEGURO ----------
/**
 * Marca el flag de apagado seguro. handler.js debe chequear este
 * flag y, si está activo, dejar de aceptar comandos NUEVOS (pero
 * no corta los que ya están en la cola de antibaneo.js). El comando
 * .apagar es responsable de esperar a que la cola se vacíe antes de
 * matar el proceso con pm2.
 */
export async function activarApagadoSeguro() {
    await db.execute('UPDATE bot_config SET apagado_seguro = 1 WHERE id = 1')
    invalidarCacheConfig()
}

export async function desactivarApagadoSeguro() {
    await db.execute('UPDATE bot_config SET apagado_seguro = 0 WHERE id = 1')
    invalidarCacheConfig()
}

export async function estaEnApagadoSeguro() {
    const c = await leerConfig()
    return !!c.apagado_seguro
}

// ---------- RAMPA DE ACTIVACIÓN GRADUAL ----------
/**
 * Se activa manualmente (comando de owner) justo después de reconectar
 * el bot tras un período de inactividad/ban. A partir de ese momento,
 * limita cuántos GRUPOS DISTINTOS pueden recibir respuestas por hora,
 * subiendo el límite según la tabla RAMPA_NIVELES. Grupos ya "vistos"
 * dentro de la ventana de la hora siguen funcionando con normalidad;
 * lo que se limita es la velocidad de EXPANSIÓN a grupos nuevos.
 */
export async function activarRampa() {
    await db.execute(
        'UPDATE bot_config SET rampa_activa = 1, rampa_inicio = NOW(), rampa_nivel = 0 WHERE id = 1'
    )
    invalidarCacheConfig()
    gruposVistosEstaHora.clear()
}

export async function desactivarRampa() {
    await db.execute('UPDATE bot_config SET rampa_activa = 0 WHERE id = 1')
    invalidarCacheConfig()
}

function obtenerLimiteRampaParaHoras(horasTranscurridas) {
    let limite = CONFIG.RAMPA_NIVELES[0].maxGruposPorHora
    for (const nivel of CONFIG.RAMPA_NIVELES) {
        if (horasTranscurridas >= nivel.horas) limite = nivel.maxGruposPorHora
    }
    return limite
}

// Ventana deslizante de grupos distintos atendidos en la hora actual.
// Se resetea automáticamente al cambiar de hora-reloj para simplificar
// (no es una ventana perfecta de 60min móviles, pero es más que
// suficiente para el propósito: limitar expansión, no medir con precisión).
let horaActualVentana = null
const gruposVistosEstaHora = new Set()

/**
 * Devuelve { permitido: bool, motivo? } para un grupo dado.
 * Si la rampa no está activa, siempre permite (comportamiento normal).
 */
export async function verificarRampa(grupoJid) {
    const c = await leerConfig()
    if (!c.rampa_activa) return { permitido: true }

    const ahora = new Date()
    const horaClave = `${ahora.getFullYear()}-${ahora.getMonth()}-${ahora.getDate()}-${ahora.getHours()}`
    if (horaClave !== horaActualVentana) {
        horaActualVentana = horaClave
        gruposVistosEstaHora.clear()
    }

    if (gruposVistosEstaHora.has(grupoJid)) {
        return { permitido: true } // ya estaba dentro del cupo de esta hora
    }

    const horasTranscurridas = (Date.now() - new Date(c.rampa_inicio).getTime()) / 3_600_000
    const limite = obtenerLimiteRampaParaHoras(horasTranscurridas)

    if (gruposVistosEstaHora.size >= limite) {
        return {
            permitido: false,
            motivo: `Rampa de activación gradual activa (cupo de ${limite} grupos nuevos/hora alcanzado)`
        }
    }

    gruposVistosEstaHora.add(grupoJid)
    return { permitido: true }
}

export async function estadoRampa() {
    const c = await leerConfig()
    if (!c.rampa_activa) return { activa: false }

    const horasTranscurridas = (Date.now() - new Date(c.rampa_inicio).getTime()) / 3_600_000
    const limiteActual = obtenerLimiteRampaParaHoras(horasTranscurridas)

    return {
        activa: true,
        horasTranscurridas: horasTranscurridas.toFixed(1),
        limiteGruposPorHoraActual: limiteActual === Infinity ? 'sin límite' : limiteActual,
        gruposAtendidosEstaHora: gruposVistosEstaHora.size,
    }
}

export default {
    asegurarTablaConfig,
    activarMantenimiento,
    desactivarMantenimiento,
    estaEnMantenimiento,
    activarEmergencia,
    desactivarEmergencia,
    activarApagadoSeguro,
    desactivarApagadoSeguro,
    estaEnApagadoSeguro,
    activarRampa,
    desactivarRampa,
    verificarRampa,
    estadoRampa,
}
