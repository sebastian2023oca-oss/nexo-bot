// ============================================================
// SISTEMA ANTI-BANEOS — NEXO BOT (Fase 1: Núcleo Anti-Flood)
// ============================================================
// Este módulo NO conoce tus comandos. Se engancha en handler.js
// como una capa "envoltura" alrededor de sock.sendMessage y de
// la ejecución de comandos. Vive 100% en memoria (no usa MySQL)
// porque sus datos son de corta duración y se reinician en cada
// despliegue, que es lo correcto para contadores de flood.
//
// Exporta:
//   - inicializarAntibaneo(sock)   → engancha sock.sendMessage
//   - verificarFlood(userJid, jid) → true si debe bloquearse
//   - verificarSpamInterno(userJid, cmd) → true si es repetido
//   - encolarEnvio(jid, fn, prioridad) → cola con throttling real
//   - obtenerStatsAntibaneo()      → para comando .antibaneostats
// ============================================================

// ---------- CONFIGURACIÓN (valores conservadores) ----------
const CONFIG = {
    // Anti-flood por usuario: máx N comandos en X ms
    FLOOD_USUARIO_MAX: 6,
    FLOOD_USUARIO_VENTANA_MS: 10_000, // 10s

    // Anti-flood por grupo: máx N comandos en X ms (de cualquier usuario combinado)
    FLOOD_GRUPO_MAX: 20,
    FLOOD_GRUPO_VENTANA_MS: 10_000,

    // Límite duro de mensajes por minuto / hora (por usuario)
    LIMITE_POR_MINUTO: 12,
    LIMITE_POR_HORA: 150,

    // Detector de comando repetido: mismo cmd+args N veces seguidas → cooldown forzado
    SPAM_REPETIDO_MAX: 4,
    SPAM_REPETIDO_VENTANA_MS: 30_000,
    SPAM_REPETIDO_BLOQUEO_MS: 60_000,

    // Cola global: delay aleatorio entre envíos consecutivos (humaniza el ritmo)
    DELAY_MIN_MS: 700,
    DELAY_MAX_MS: 2200,

    // "Escribiendo..." simulado antes de responder
    TYPING_MIN_MS: 350,
    TYPING_MAX_MS: 1100,

    // Menciones masivas: cap duro de @mentions en un solo mensaje saliente
    MAX_MENTIONS_POR_MENSAJE: 40,

    // Limpieza de Maps en memoria para que no crezcan sin límite
    LIMPIEZA_INTERVALO_MS: 5 * 60_000, // cada 5 minutos
}

// ---------- ESTRUCTURAS EN MEMORIA ----------
const ventanasUsuario = new Map()      // jid -> [timestamps]
const ventanasGrupo = new Map()        // jidGrupo -> [timestamps]
const contadorMinuto = new Map()       // jid -> { count, desde }
const contadorHora = new Map()         // jid -> { count, desde }
const ultimoComando = new Map()        // jid -> { firma, veces, primeraVez }
const bloqueadosTemporal = new Map()   // jid -> expiraTimestamp

const statsGlobales = {
    mensajesEnviados: 0,
    mensajesBloqueadosFlood: 0,
    mensajesBloqueadosSpam: 0,
    inicioProceso: Date.now(),
}

// ---------- COLA GLOBAL CON SUB-COLAS POR GRUPO ----------
// Cada grupo tiene su propia subcola FIFO; un round-robin simple
// recorre los grupos con pendientes para que un grupo muy activo
// no monopolice el envío y deje "muertos" a los demás.
const subcolasPorGrupo = new Map() // jid -> [{fn, prioridad, resolve, reject}]
let colaProcesando = false

function azar(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function obtenerSubcola(jid) {
    if (!subcolasPorGrupo.has(jid)) subcolasPorGrupo.set(jid, [])
    return subcolasPorGrupo.get(jid)
}

/**
 * Encola una función de envío (normalmente sock.sendMessage(...)) con
 * prioridad. prioridad: 'owner' > 'normal' > 'broadcast'
 */
export function encolarEnvio(jid, fn, prioridad = 'normal') {
    return new Promise((resolve, reject) => {
        const subcola = obtenerSubcola(jid)
        const tarea = { fn, prioridad, resolve, reject }

        // Las tareas de owner se insertan al frente de su subcola
        if (prioridad === 'owner') {
            subcola.unshift(tarea)
        } else {
            subcola.push(tarea)
        }

        procesarColaGlobal()
    })
}

const ORDEN_PRIORIDAD = { owner: 0, normal: 1, broadcast: 2 }

async function procesarColaGlobal() {
    if (colaProcesando) return
    colaProcesando = true

    try {
        while (true) {
            // Elegir la próxima subcola con pendientes, priorizando por
            // la prioridad de la tarea al frente de cada subcola.
            let mejorJid = null
            let mejorPrioridad = Infinity

            for (const [jid, subcola] of subcolasPorGrupo) {
                if (subcola.length === 0) continue
                const p = ORDEN_PRIORIDAD[subcola[0].prioridad] ?? 1
                if (p < mejorPrioridad) {
                    mejorPrioridad = p
                    mejorJid = jid
                }
            }

            if (mejorJid === null) break // nada pendiente en ninguna subcola

            const subcola = subcolasPorGrupo.get(mejorJid)
            const tarea = subcola.shift()

            try {
                const resultado = await tarea.fn()
                statsGlobales.mensajesEnviados++
                tarea.resolve(resultado)
            } catch (err) {
                tarea.reject(err)
            }

            // Limpiar subcolas vacías para que no acumulen memoria
            if (subcola.length === 0) subcolasPorGrupo.delete(mejorJid)

            // Delay humanizado entre cada envío de la cola global
            await new Promise(r => setTimeout(r, azar(CONFIG.DELAY_MIN_MS, CONFIG.DELAY_MAX_MS)))
        }
    } finally {
        colaProcesando = false
    }
}

// ---------- ANTI-FLOOD POR USUARIO Y POR GRUPO ----------
function limpiarVentana(mapa, jid, ventanaMs) {
    const ahora = Date.now()
    const arr = mapa.get(jid) || []
    const filtrado = arr.filter(t => ahora - t < ventanaMs)
    mapa.set(jid, filtrado)
    return filtrado
}

/**
 * Devuelve { bloqueado: bool, motivo, minutosRestantes } evaluando
 * flood de usuario, flood de grupo, límite/min y límite/hora.
 * No modifica nada si bloqueado=true (para no "premiar" el flood
 * con un nuevo timestamp registrado).
 */
export function verificarFlood(userJid, grupoJid) {
    const ahora = Date.now()

    // 0) ¿Está en bloqueo temporal por spam repetido?
    const expiraBloqueo = bloqueadosTemporal.get(userJid)
    if (expiraBloqueo && expiraBloqueo > ahora) {
        return {
            bloqueado: true,
            motivo: 'spam_repetido',
            minutosRestantes: Math.ceil((expiraBloqueo - ahora) / 60000)
        }
    } else if (expiraBloqueo) {
        bloqueadosTemporal.delete(userJid)
    }

    // 1) Flood por usuario
    const ventanaUsr = limpiarVentana(ventanasUsuario, userJid, CONFIG.FLOOD_USUARIO_VENTANA_MS)
    if (ventanaUsr.length >= CONFIG.FLOOD_USUARIO_MAX) {
        statsGlobales.mensajesBloqueadosFlood++
        return { bloqueado: true, motivo: 'flood_usuario', minutosRestantes: 1 }
    }

    // 2) Flood por grupo (protege al grupo completo de ser inundado)
    if (grupoJid) {
        const ventanaGrp = limpiarVentana(ventanasGrupo, grupoJid, CONFIG.FLOOD_GRUPO_VENTANA_MS)
        if (ventanaGrp.length >= CONFIG.FLOOD_GRUPO_MAX) {
            statsGlobales.mensajesBloqueadosFlood++
            return { bloqueado: true, motivo: 'flood_grupo', minutosRestantes: 1 }
        }
    }

    // 3) Límite por minuto
    const cMin = contadorMinuto.get(userJid)
    if (cMin && ahora - cMin.desde < 60_000) {
        if (cMin.count >= CONFIG.LIMITE_POR_MINUTO) {
            statsGlobales.mensajesBloqueadosFlood++
            return { bloqueado: true, motivo: 'limite_minuto', minutosRestantes: 1 }
        }
    }

    // 4) Límite por hora
    const cHora = contadorHora.get(userJid)
    if (cHora && ahora - cHora.desde < 3_600_000) {
        if (cHora.count >= CONFIG.LIMITE_POR_HORA) {
            statsGlobales.mensajesBloqueadosFlood++
            const minutosRestantes = Math.ceil((3_600_000 - (ahora - cHora.desde)) / 60000)
            return { bloqueado: true, motivo: 'limite_hora', minutosRestantes }
        }
    }

    // --- No está bloqueado: registrar este evento ---
    ventanaUsr.push(ahora)
    ventanasUsuario.set(userJid, ventanaUsr)

    if (grupoJid) {
        const ventanaGrp = ventanasGrupo.get(grupoJid) || []
        ventanaGrp.push(ahora)
        ventanasGrupo.set(grupoJid, ventanaGrp)
    }

    if (!cMin || ahora - cMin.desde >= 60_000) {
        contadorMinuto.set(userJid, { count: 1, desde: ahora })
    } else {
        cMin.count++
    }

    if (!cHora || ahora - cHora.desde >= 3_600_000) {
        contadorHora.set(userJid, { count: 1, desde: ahora })
    } else {
        cHora.count++
    }

    return { bloqueado: false }
}

// ---------- DETECTOR DE COMANDO REPETIDO / SPAM INTERNO ----------
/**
 * Si el mismo usuario ejecuta el MISMO comando con los MISMOS args
 * más de SPAM_REPETIDO_MAX veces dentro de la ventana, se bloquea
 * temporalmente (independiente del anti-flood general).
 */
export function verificarSpamInterno(userJid, cmd, args) {
    const ahora = Date.now()
    const firma = `${cmd}:${(args || []).join(' ')}`
    const registro = ultimoComando.get(userJid)

    if (!registro || registro.firma !== firma || ahora - registro.primeraVez > CONFIG.SPAM_REPETIDO_VENTANA_MS) {
        ultimoComando.set(userJid, { firma, veces: 1, primeraVez: ahora })
        return false
    }

    registro.veces++

    if (registro.veces >= CONFIG.SPAM_REPETIDO_MAX) {
        bloqueadosTemporal.set(userJid, ahora + CONFIG.SPAM_REPETIDO_BLOQUEO_MS)
        statsGlobales.mensajesBloqueadosSpam++
        ultimoComando.delete(userJid)
        return true
    }

    return false
}

// ---------- LIMITADOR DE MENCIONES MASIVAS ----------
/**
 * Recorta el array de mentions de un payload de sendMessage si excede
 * el máximo permitido. Mutación defensiva: devuelve un nuevo objeto,
 * no modifica el original.
 */
export function limitarMenciones(payload) {
    if (!payload?.mentions || payload.mentions.length <= CONFIG.MAX_MENTIONS_POR_MENSAJE) {
        return payload
    }
    return {
        ...payload,
        mentions: payload.mentions.slice(0, CONFIG.MAX_MENTIONS_POR_MENSAJE)
    }
}

// ---------- "ESCRIBIENDO..." SIMULADO ----------
export async function simularEscribiendo(sock, jid) {
    try {
        await sock.sendPresenceUpdate('composing', jid)
        await new Promise(r => setTimeout(r, azar(CONFIG.TYPING_MIN_MS, CONFIG.TYPING_MAX_MS)))
        await sock.sendPresenceUpdate('paused', jid)
    } catch {
        // Si falla la presencia (algunos transports no la soportan), no es crítico
    }
}

// ---------- ENGANCHE PRINCIPAL: ENVUELVE sock.sendMessage ----------
/**
 * Reemplaza sock.sendMessage por una versión que:
 *  1) Simula "escribiendo..." brevemente
 *  2) Limita menciones masivas
 *  3) Pasa por la cola global con delay humanizado
 * El resto del bot sigue llamando sock.sendMessage(jid, payload, opts)
 * exactamente igual que antes — cero cambios en los ~150 comandos.
 */
export function inicializarAntibaneo(sock) {
    const sendOriginal = sock.sendMessage.bind(sock)

    sock.sendMessage = async (jid, payload, opciones) => {
        const payloadSeguro = limitarMenciones(payload)
        const esBroadcast = payload?.__prioridadBroadcast === true
        const prioridad = esBroadcast ? 'broadcast' : 'normal'

        return encolarEnvio(jid, async () => {
            if (payload?.text || payload?.image || payload?.video) {
                await simularEscribiendo(sock, jid)
            }
            return sendOriginal(jid, payloadSeguro, opciones)
        }, prioridad)
    }

    // Limpieza periódica para que los Maps no crezcan indefinidamente
    setInterval(limpiarEstructurasEnMemoria, CONFIG.LIMPIEZA_INTERVALO_MS)

    console.log('🛡️  Sistema Anti-Baneos (Fase 1) activado.')
}

function limpiarEstructurasEnMemoria() {
    const ahora = Date.now()

    for (const [jid, arr] of ventanasUsuario) {
        const filtrado = arr.filter(t => ahora - t < CONFIG.FLOOD_USUARIO_VENTANA_MS)
        if (filtrado.length === 0) ventanasUsuario.delete(jid)
        else ventanasUsuario.set(jid, filtrado)
    }

    for (const [jid, arr] of ventanasGrupo) {
        const filtrado = arr.filter(t => ahora - t < CONFIG.FLOOD_GRUPO_VENTANA_MS)
        if (filtrado.length === 0) ventanasGrupo.delete(jid)
        else ventanasGrupo.set(jid, filtrado)
    }

    for (const [jid, c] of contadorMinuto) {
        if (ahora - c.desde >= 60_000) contadorMinuto.delete(jid)
    }

    for (const [jid, c] of contadorHora) {
        if (ahora - c.desde >= 3_600_000) contadorHora.delete(jid)
    }

    for (const [jid, registro] of ultimoComando) {
        if (ahora - registro.primeraVez > CONFIG.SPAM_REPETIDO_VENTANA_MS) ultimoComando.delete(jid)
    }

    for (const [jid, expira] of bloqueadosTemporal) {
        if (expira <= ahora) bloqueadosTemporal.delete(jid)
    }
}

// ---------- ESTADÍSTICAS (para comando owner) ----------
export function obtenerStatsAntibaneo() {
    const uptimeMs = Date.now() - statsGlobales.inicioProceso
    return {
        ...statsGlobales,
        uptimeMinutos: Math.floor(uptimeMs / 60000),
        usuariosEnVentana: ventanasUsuario.size,
        gruposEnVentana: ventanasGrupo.size,
        usuariosBloqueadosAhora: bloqueadosTemporal.size,
        subcolasPendientes: subcolasPorGrupo.size,
    }
}

export default {
    inicializarAntibaneo,
    verificarFlood,
    verificarSpamInterno,
    encolarEnvio,
    limitarMenciones,
    simularEscribiendo,
    obtenerStatsAntibaneo,
    CONFIG,
}
