import db from './db.js'

export const BONUS_MEJORA_DEFAULT = 0.10

export const EFECTOS_ITEMS = {
    pico_reforzado: {
        nombre: 'Pico Reforzado',
        emoji: '⛏️',
        multiplicadorBase: 2,
        bonusPorNivel: 0.25,
        descripcion: 'aumenta las ganancias al minar'
    },
    caña_premium: {
        nombre: 'Caña Premium',
        emoji: '🎣',
        multiplicadorBase: 1.5,
        bonusPorNivel: 0.10,
        descripcion: 'aumenta el valor de la pesca'
    },
    trampa_caza: {
        nombre: 'Trampa de Caza',
        emoji: '🪤',
        multiplicadorBase: 1.4,
        bonusPorNivel: 0.10,
        descripcion: 'aumenta el valor de la caza'
    },
    amuleto_suerte: {
        nombre: 'Amuleto de Suerte',
        emoji: '🍀',
        multiplicadorBase: 1.3,
        bonusPorNivel: 0.05,
        descripcion: 'aumenta monedas y probabilidad de encontrar ítems'
    },
    espada_basica: {
        nombre: 'Espada Básica',
        emoji: '⚔️',
        multiplicadorBase: 1.1,
        bonusPorNivel: 0.10,
        descripcion: 'aumenta las recompensas de aventura'
    }
}

export function obtenerConfigMejora(itemKey) {
    return EFECTOS_ITEMS[itemKey] || {
        nombre: itemKey,
        emoji: '🔧',
        multiplicadorBase: 1,
        bonusPorNivel: BONUS_MEJORA_DEFAULT,
        descripcion: 'mejora general del objeto'
    }
}

export async function obtenerItemEquipado(userJid, itemKey) {
    const [rows] = await db.execute(
        `SELECT item, cantidad, equipado, COALESCE(nivel_mejora, 0) AS nivel_mejora
         FROM inventario_usuario
         WHERE jid = ? AND item = ? AND equipado = 1
         LIMIT 1`,
        [userJid, itemKey]
    )

    return rows.length > 0 ? rows[0] : null
}

export function calcularMultiplicadorMejora(itemKey, itemInventario) {
    if (!itemInventario) return 1

    const config = obtenerConfigMejora(itemKey)
    const nivelMejora = Number(itemInventario.nivel_mejora || 0)

    return config.multiplicadorBase + (nivelMejora * config.bonusPorNivel)
}

export function obtenerNivelMejora(itemInventario) {
    return Number(itemInventario?.nivel_mejora || 0)
}

export function formatearLineaBonus(itemKey, itemInventario, textoBase = 'activo') {
    if (!itemInventario) return ''

    const config = obtenerConfigMejora(itemKey)
    const nivelMejora = obtenerNivelMejora(itemInventario)
    const multiplicador = calcularMultiplicadorMejora(itemKey, itemInventario)

    return `\n${config.emoji} *${config.nombre} ${textoBase}:* x${multiplicador.toFixed(2)} | Mejora +${nivelMejora}`
}
