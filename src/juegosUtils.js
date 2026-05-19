import db from './db.js'

// Probabilidad de estrella de reputación: 2.5% base, +5% con poción de suerte
export async function intentarDarEstrella(userJid, sock, jid, mensaje) {
    const [pocion] = await db.execute(
        'SELECT * FROM items_activos WHERE jid = ? AND item = "pocion" AND expira > NOW()',
        [userJid]
    )
    const tienePocion = pocion.length > 0
    const prob = tienePocion ? 0.075 : 0.025 // 7.5% con poción, 2.5% sin ella

    if (Math.random() < prob) {
        await db.execute('UPDATE usuarios SET reputacion = reputacion + 1 WHERE jid = ?', [userJid])
        const msg = tienePocion
            ? `⭐ *¡Estrella de reputación obtenida!* (🧪 Poción de suerte activa)`
            : `⭐ *¡Estrella de reputación obtenida!*`
        await sock.sendMessage(jid, { text: msg }, { quoted: mensaje })
    }
}

// Registrar victoria y verificar insignias
export async function registrarVictoria(userJid, sock, jid, mensaje) {
    // Obtener o crear registro
    const [rows] = await db.execute('SELECT * FROM juegos_stats WHERE jid = ?', [userJid])

    if (rows.length === 0) {
        await db.execute('INSERT INTO juegos_stats (jid, victorias_total) VALUES (?, 1)', [userJid])
    } else {
        await db.execute('UPDATE juegos_stats SET victorias_total = victorias_total + 1 WHERE jid = ?', [userJid])
    }

    const [updated] = await db.execute('SELECT * FROM juegos_stats WHERE jid = ?', [userJid])
    const stats = updated[0]
    const victorias = stats.victorias_total

    // Insignia Easy: 10 victorias
    if (victorias >= 10 && !stats.insignia_easy) {
        await db.execute('UPDATE juegos_stats SET insignia_easy = 1 WHERE jid = ?', [userJid])
        await db.execute('INSERT INTO insignias (jid, nombre) VALUES (?, ?)', [userJid, '🥉 Jugador Easy'])
        if (!stats.premio_easy_cobrado) {
            await db.execute('UPDATE usuarios SET monedas = monedas + 1000 WHERE jid = ?', [userJid])
            await db.execute('UPDATE juegos_stats SET premio_easy_cobrado = 1 WHERE jid = ?', [userJid])
            await sock.sendMessage(jid, {
                text: `🏆 *¡INSIGNIA DESBLOQUEADA!*\n\n🥉 *Jugador Easy*\n✅ Llegaste a *10 victorias*!\n💰 *Premio:* +1,000 monedas`
            }, { quoted: mensaje })
        }
    }

    // Insignia Medium: 100 victorias
    if (victorias >= 100 && !stats.insignia_medium) {
        await db.execute('UPDATE juegos_stats SET insignia_medium = 1 WHERE jid = ?', [userJid])
        await db.execute('INSERT INTO insignias (jid, nombre) VALUES (?, ?)', [userJid, '🥈 Jugador Medium'])
        if (!stats.premio_medium_cobrado) {
            await db.execute('UPDATE usuarios SET monedas = monedas + 10000 WHERE jid = ?', [userJid])
            await db.execute('UPDATE juegos_stats SET premio_medium_cobrado = 1 WHERE jid = ?', [userJid])
            await sock.sendMessage(jid, {
                text: `🏆 *¡INSIGNIA DESBLOQUEADA!*\n\n🥈 *Jugador Medium*\n✅ Llegaste a *100 victorias*!\n💰 *Premio:* +10,000 monedas`
            }, { quoted: mensaje })
        }
    }

    // Insignia Hard: 1000 victorias
    if (victorias >= 1000 && !stats.insignia_hard) {
        await db.execute('UPDATE juegos_stats SET insignia_hard = 1 WHERE jid = ?', [userJid])
        await db.execute('INSERT INTO insignias (jid, nombre) VALUES (?, ?)', [userJid, '🥇 Jugador Hard'])
        if (!stats.premio_hard_cobrado) {
            await db.execute('UPDATE usuarios SET monedas = monedas + 100000 WHERE jid = ?', [userJid])
            await db.execute('UPDATE juegos_stats SET premio_hard_cobrado = 1 WHERE jid = ?', [userJid])
            await sock.sendMessage(jid, {
                text: `🏆 *¡INSIGNIA DESBLOQUEADA!*\n\n🥇 *Jugador Hard*\n✅ Llegaste a *1,000 victorias*!\n💰 *Premio:* +100,000 monedas`
            }, { quoted: mensaje })
        }
    }

    return victorias
}

// Dar recompensa de juego
export async function darRecompensaJuego(userJid, xp = 5, monedas = 20) {
    const { darXP } = await import('./utils.js')
    await darXP(userJid, xp)
    if (monedas > 0) {
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [monedas, userJid])
    }
}
