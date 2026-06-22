// ============================================================
// OPERACIONES — NEXO BOT (Fase 3: Monitoreo y Anti-Crash)
// ============================================================
// Este módulo observa al proceso (no a WhatsApp): cuánta RAM/CPU
// usa, si MySQL responde, y captura errores que de otro modo
// tumbarían el proceso entero. No decide nada sobre flujo de
// mensajes (eso es trabajo de mantenimiento.js) — solo vigila
// y registra.
//
// Exporta:
//   - inicializarOps(sock)         → activa anti-crash + monitores periódicos
//   - registrarError(info)         → guarda en logs_errores + reporta
//   - registrarActividad(info)     → guarda en logs_actividad
//   - obtenerEstadoSistema()       → snapshot RAM/CPU/BD para owners
//   - obtenerResumenActividad(horas) → conteo de comandos/usuarios recientes
// ============================================================

import os from 'os'
import db from './db.js'

const CONFIG = {
    MONITOREO_INTERVALO_MS: 5 * 60_000,     // chequeo de salud cada 5 min
    RAM_ALERTA_PORCENTAJE: 85,               // % de RAM del sistema usada → alerta
    LOOP_DETECCION_VENTANA_MS: 2_000,        // ventana para detectar recursión/loop
    LOOP_DETECCION_MAX_LLAMADAS: 50,         // llamadas al mismo punto en la ventana
}

let sockOps = null
let reportarErrorFn = null // se inyecta para reusar tu errorReporter.js sin import circular

export async function asegurarTablasOps() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS logs_errores (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            comando     VARCHAR(60),
            jid         VARCHAR(60),
            chat_jid    VARCHAR(60),
            mensaje_error TEXT,
            stack       TEXT,
            fecha       DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS logs_actividad (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            tipo        ENUM('comando', 'mensaje', 'conexion', 'desconexion') NOT NULL,
            jid         VARCHAR(60),
            chat_jid    VARCHAR(60),
            detalle     VARCHAR(120),
            fecha       DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)
}

/**
 * Permite inyectar tu función reportarErrorComando (de errorReporter.js)
 * sin que ops.js tenga que importarla directamente — así evitamos que
 * ops.js dependa de nodemailer si algún día quieres usar ops.js solo.
 */
export function conectarReporteExterno(fn) {
    reportarErrorFn = fn
}

// ---------- REGISTRO DE ERRORES ----------
export async function registrarError({ comando = null, jid = null, chatJid = null, error }) {
    try {
        await db.execute(
            'INSERT INTO logs_errores (comando, jid, chat_jid, mensaje_error, stack) VALUES (?, ?, ?, ?, ?)',
            [comando, jid, chatJid, String(error?.message || error), error?.stack || null]
        )
    } catch (e) {
        // Si ni siquiera se puede loguear el error, al menos que quede en consola
        console.error('⚠️  No se pudo registrar el error en logs_errores:', e.message)
    }

    // Reusar tu sistema de alertas (WhatsApp a owners + correo) si está conectado
    if (reportarErrorFn && sockOps) {
        try {
            await reportarErrorFn(sockOps, {
                comandoTexto: comando || '(desconocido)',
                mensaje: { key: { remoteJid: chatJid, participant: jid } },
                error
            })
        } catch {}
    }
}

// ---------- REGISTRO DE ACTIVIDAD ----------
export async function registrarActividad({ tipo, jid = null, chatJid = null, detalle = null }) {
    try {
        await db.execute(
            'INSERT INTO logs_actividad (tipo, jid, chat_jid, detalle) VALUES (?, ?, ?, ?)',
            [tipo, jid, chatJid, detalle]
        )
    } catch {
        // La actividad es informativa, no crítica — si falla no interrumpimos nada
    }
}

// ---------- MONITOREO RAM / CPU / BD ----------
export function obtenerEstadoSistema() {
    const mem = process.memoryUsage()
    const ramSistemaTotal = os.totalmem()
    const ramSistemaLibre = os.freemem()
    const ramSistemaUsadaPorcentaje = (((ramSistemaTotal - ramSistemaLibre) / ramSistemaTotal) * 100).toFixed(1)
    const load = os.loadavg() // [1min, 5min, 15min]

    return {
        proceso: {
            rssMB: (mem.rss / 1024 / 1024).toFixed(1),
            heapUsadoMB: (mem.heapUsed / 1024 / 1024).toFixed(1),
            heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(1),
        },
        sistema: {
            ramUsadaPorcentaje: ramSistemaUsadaPorcentaje,
            cpuLoad1min: load[0].toFixed(2),
            cpuLoad5min: load[1].toFixed(2),
            cpuLoad15min: load[2].toFixed(2),
            nucleos: os.cpus().length,
        },
        uptimeProcesoMin: Math.floor(process.uptime() / 60),
    }
}

async function verificarSaludBD() {
    try {
        const conn = await db.getConnection()
        conn.release()
        return true
    } catch {
        return false
    }
}

async function chequeoPeriodicoDeSalud() {
    const estado = obtenerEstadoSistema()
    const bdSaludable = await verificarSaludBD()

    if (Number(estado.sistema.ramUsadaPorcentaje) >= CONFIG.RAM_ALERTA_PORCENTAJE) {
        console.warn(`⚠️  RAM del sistema al ${estado.sistema.ramUsadaPorcentaje}% — considera revisar memoria.`)
        await registrarError({
            comando: 'monitoreo_automatico',
            error: new Error(`RAM del sistema al ${estado.sistema.ramUsadaPorcentaje}%`)
        })
    }

    if (!bdSaludable) {
        console.error('❌ MySQL no respondió en el chequeo de salud periódico.')
        await registrarError({
            comando: 'monitoreo_automatico',
            error: new Error('MySQL no respondió en el chequeo de salud periódico')
        })
    }
}

// ---------- ANTI-CRASH / RECUPERACIÓN AUTOMÁTICA ----------
/**
 * Captura excepciones no manejadas y promesas rechazadas sin catch.
 * Sin esto, Baileys/Node pueden tumbar el proceso completo por un
 * solo error en un comando aislado. Con esto: se loguea, se reporta,
 * y el proceso SIGUE VIVO (PM2 ni se entera de que pasó algo).
 */
function activarAntiCrash() {
    process.on('uncaughtException', (error) => {
        console.error('🔥 uncaughtException capturada (el bot sigue corriendo):', error)
        registrarError({ comando: 'uncaughtException', error })
    })

    process.on('unhandledRejection', (reason) => {
        const error = reason instanceof Error ? reason : new Error(String(reason))
        console.error('🔥 unhandledRejection capturada (el bot sigue corriendo):', error)
        registrarError({ comando: 'unhandledRejection', error })
    })
}

// ---------- PROTECCIÓN CONTRA LOOPS INFINITOS ----------
// Un "loop" aquí se define como: la misma función disparándose
// muchísimas veces en una ventana muy corta. Útil para detectar
// bugs de listeners de juegos (adivina.js, trivia.js, etc.) que
// por algún error queden escuchando para siempre.
const contadorLlamadas = new Map() // etiqueta -> [timestamps]

export function detectarLoop(etiqueta) {
    const ahora = Date.now()
    const arr = (contadorLlamadas.get(etiqueta) || []).filter(
        t => ahora - t < CONFIG.LOOP_DETECCION_VENTANA_MS
    )
    arr.push(ahora)
    contadorLlamadas.set(etiqueta, arr)

    if (arr.length >= CONFIG.LOOP_DETECCION_MAX_LLAMADAS) {
        console.error(`🔥 Posible loop infinito detectado en "${etiqueta}" (${arr.length} llamadas en ${CONFIG.LOOP_DETECCION_VENTANA_MS}ms)`)
        contadorLlamadas.delete(etiqueta) // resetear para no espamear el log
        return true
    }
    return false
}

// ---------- RESUMEN DE ACTIVIDAD RECIENTE ----------
export async function obtenerResumenActividad(horas = 24) {
    const [comandos] = await db.execute(
        `SELECT COUNT(*) as total FROM logs_actividad WHERE tipo = 'comando' AND fecha > DATE_SUB(NOW(), INTERVAL ? HOUR)`,
        [horas]
    )
    const [usuariosUnicos] = await db.execute(
        `SELECT COUNT(DISTINCT jid) as total FROM logs_actividad WHERE tipo = 'comando' AND fecha > DATE_SUB(NOW(), INTERVAL ? HOUR)`,
        [horas]
    )
    const [gruposUnicos] = await db.execute(
        `SELECT COUNT(DISTINCT chat_jid) as total FROM logs_actividad WHERE tipo = 'comando' AND fecha > DATE_SUB(NOW(), INTERVAL ? HOUR)`,
        [horas]
    )
    const [errores] = await db.execute(
        `SELECT COUNT(*) as total FROM logs_errores WHERE fecha > DATE_SUB(NOW(), INTERVAL ? HOUR)`,
        [horas]
    )

    return {
        horas,
        comandosEjecutados: comandos[0].total,
        usuariosUnicos: usuariosUnicos[0].total,
        gruposActivos: gruposUnicos[0].total,
        errores: errores[0].total,
    }
}

// ---------- INICIALIZACIÓN ----------
export async function inicializarOps(sock) {
    sockOps = sock
    await asegurarTablasOps()
    activarAntiCrash()
    setInterval(chequeoPeriodicoDeSalud, CONFIG.MONITOREO_INTERVALO_MS)
    console.log('🩺 Sistema de Operaciones (Fase 3) activado — monitoreo + anti-crash.')
}

export default {
    inicializarOps,
    conectarReporteExterno,
    registrarError,
    registrarActividad,
    obtenerEstadoSistema,
    obtenerResumenActividad,
    detectarLoop,
    asegurarTablasOps,
}
