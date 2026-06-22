// ============================================================
// SISTEMA DE CACHÉ — NEXO BOT (Fase 2: Caché y Rendimiento)
// ============================================================
// Caché genérico en memoria con TTL (time-to-live). No depende
// de Redis ni de nada externo — vive en un Map y se limpia sola.
// Pensado para queries que se repiten MUCHO en poco tiempo
// (perfiles, rankings, menú) donde una pequeña ventana de
// "dato un poco viejo" es aceptable a cambio de menos carga en
// MySQL y respuestas más rápidas (lo cual también ayuda al
// anti-baneo: respuestas más rápidas = menos tiempo bloqueando
// la cola de envío).
//
// Exporta:
//   - obtenerOCachear(key, ttlMs, fnAsincrona) → valor cacheado o fresco
//   - invalidarCache(key)        → borra una entrada puntual
//   - invalidarCachePorPrefijo(prefijo) → borra varias relacionadas
//   - warmupCache()              → precarga cosas pesadas al boot
//   - obtenerStatsCache()        → para panel de owners
// ============================================================

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import db from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------- CONFIGURACIÓN DE TTLs POR TIPO ----------
// Valores conservadores: lo suficientemente cortos para que nadie
// note datos "viejos" en una sesión de juego normal, pero lo
// suficientemente largos para tumbar el 90% de las queries repetidas.
export const TTL = {
    PERFIL: 20_000,        // 20s — un perfil no cambia tan rápido
    RANKING: 45_000,       // 45s — los rankings globales cambian lento
    RANKING_CASINO: 30_000,
    MENU_IMAGEN: Infinity, // la imagen del menú no cambia en runtime
}

// ---------- ALMACÉN EN MEMORIA ----------
const almacen = new Map() // key -> { valor, expira }

const statsCache = {
    hits: 0,
    misses: 0,
    invalidaciones: 0,
}

/**
 * Devuelve el valor cacheado si existe y no expiró; si no,
 * ejecuta fnAsincrona(), guarda el resultado y lo devuelve.
 * fnAsincrona debe ser una función sin argumentos (usa closures
 * para capturar lo que necesite) que retorna una Promise.
 */
export async function obtenerOCachear(key, ttlMs, fnAsincrona) {
    const ahora = Date.now()
    const entrada = almacen.get(key)

    if (entrada && entrada.expira > ahora) {
        statsCache.hits++
        return entrada.valor
    }

    statsCache.misses++
    const valor = await fnAsincrona()

    almacen.set(key, {
        valor,
        expira: ttlMs === Infinity ? Infinity : ahora + ttlMs
    })

    return valor
}

/** Borra una entrada específica del caché (ej. tras un .setbio) */
export function invalidarCache(key) {
    if (almacen.delete(key)) statsCache.invalidaciones++
}

/** Borra todas las entradas cuya key empiece con el prefijo dado */
export function invalidarCachePorPrefijo(prefijo) {
    for (const key of almacen.keys()) {
        if (key.startsWith(prefijo)) {
            almacen.delete(key)
            statsCache.invalidaciones++
        }
    }
}

// ---------- LIMPIEZA PERIÓDICA (GARBAGE COLLECTION) ----------
function limpiarCacheVencido() {
    const ahora = Date.now()
    for (const [key, entrada] of almacen) {
        if (entrada.expira !== Infinity && entrada.expira <= ahora) {
            almacen.delete(key)
        }
    }
}

let intervaloLimpieza = null

export function iniciarLimpiezaCache(intervaloMs = 60_000) {
    if (intervaloLimpieza) clearInterval(intervaloLimpieza)
    intervaloLimpieza = setInterval(limpiarCacheVencido, intervaloMs)
}

// ---------- WARM-UP DE SESIÓN ----------
/**
 * Se llama una vez al bootear el bot (desde index.js o handler.js).
 * Precalienta cosas que son costosas la PRIMERA vez:
 *   - Pool de conexiones MySQL (fuerza al menos 2 conexiones reales)
 *   - Lectura de la imagen del menú desde disco
 * Así el primer usuario que escribe después de un reinicio no sufre
 * la latencia de "primera vez" de estas operaciones.
 */
export async function warmupCache() {
    const resultados = { mysql: false, menuImagen: false }

    // 1) Warm-up del pool MySQL
    try {
        const conn1 = await db.getConnection()
        const conn2 = await db.getConnection()
        conn1.release()
        conn2.release()
        resultados.mysql = true
    } catch (err) {
        console.error('⚠️  Warm-up MySQL falló:', err.message)
    }

    // 2) Precargar la imagen del menú en caché (TTL infinito, no cambia)
    try {
        const rutaImagen = join(__dirname, '../assets/menu.jpg')
        const buffer = readFileSync(rutaImagen)
        almacen.set('menu:imagen', { valor: buffer, expira: Infinity })
        resultados.menuImagen = true
    } catch (err) {
        console.error('⚠️  Warm-up imagen de menú falló (¿existe assets/menu.jpg?):', err.message)
    }

    console.log(`🔥 Warm-up completado — MySQL: ${resultados.mysql ? 'OK' : 'FALLÓ'} | Imagen menú: ${resultados.menuImagen ? 'OK' : 'FALLÓ'}`)
    return resultados
}

/** Devuelve la imagen del menú desde caché (o la lee si por algún motivo no estaba) */
export function obtenerImagenMenu() {
    const entrada = almacen.get('menu:imagen')
    if (entrada) return entrada.valor

    const rutaImagen = join(__dirname, '../assets/menu.jpg')
    const buffer = readFileSync(rutaImagen)
    almacen.set('menu:imagen', { valor: buffer, expira: Infinity })
    return buffer
}

// ---------- ESTADÍSTICAS ----------
export function obtenerStatsCache() {
    const totalConsultas = statsCache.hits + statsCache.misses
    const hitRate = totalConsultas > 0 ? ((statsCache.hits / totalConsultas) * 100).toFixed(1) : '0.0'

    return {
        ...statsCache,
        entradasActivas: almacen.size,
        hitRatePorcentaje: hitRate,
    }
}

export default {
    obtenerOCachear,
    invalidarCache,
    invalidarCachePorPrefijo,
    iniciarLimpiezaCache,
    warmupCache,
    obtenerImagenMenu,
    obtenerStatsCache,
    TTL,
}
