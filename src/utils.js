import db from './db.js'

// Cobra impuesto del 0.5% al dinero en mano
export async function cobrarImpuesto(userJid, monedas) {
    const impuesto = Math.floor((monedas || 0) * 0.005)
    if (impuesto > 0) {
        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [impuesto, userJid])
    }
    return impuesto
}

// Verifica cooldown — retorna minutos restantes o null si puede usar
export async function verificarCooldown(userJid, tipo, minutos) {
    const [rows] = await db.execute(
        'SELECT expira FROM cooldowns WHERE jid = ? AND tipo = ? AND expira > NOW()',
        [userJid, tipo]
    )
    if (rows.length > 0) {
        const diff = new Date(rows[0].expira) - Date.now()
        return Math.ceil(diff / 60000)
    }
    return null
}

// Registra cooldown
export async function registrarCooldown(userJid, tipo, minutos = 15) {
    await db.execute(
        'INSERT INTO cooldowns (jid, tipo, expira) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE)) ON DUPLICATE KEY UPDATE expira = DATE_ADD(NOW(), INTERVAL ? MINUTE)',
        [userJid, tipo, minutos, minutos]
    )
}

// Suma XP al usuario y sube de nivel si corresponde
export async function darXP(userJid, cantidad) {
    const [rows] = await db.execute('SELECT xp, nivel FROM usuarios WHERE jid = ?', [userJid])
    if (rows.length === 0) return
    const xpNuevo = (rows[0].xp || 0) + cantidad
    const nivelNuevo = Math.floor(xpNuevo / 100) + 1
    await db.execute('UPDATE usuarios SET xp = ?, nivel = ? WHERE jid = ?', [xpNuevo, nivelNuevo, userJid])
}
