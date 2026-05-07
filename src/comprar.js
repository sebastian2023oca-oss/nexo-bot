import db from './db.js'

const ITEMS = {
    doble_xp:           { nombre: 'Doble XP', precio: 1000, duracion: 3600000 },
    doble_work:         { nombre: 'Doble Work', precio: 800, duracion: 3600000 },
    caja:               { nombre: 'Caja Misteriosa', precio: 300, duracion: null },
    escudo:             { nombre: 'Escudo Anti-Robo', precio: 500, duracion: 86400000 },
    pocion:             { nombre: 'Poción de Suerte', precio: 600, duracion: 18000000 },
    ampliar_prestamo:   { nombre: 'Ampliar Préstamo', precio: 1500, duracion: null },
    reducir_interes:    { nombre: 'Reducir Interés', precio: 1000, duracion: null },
    marco:              { nombre: 'Marco Especial', precio: 400, duracion: null },
    insignia:           { nombre: 'Insignia Exclusiva', precio: 700, duracion: null },
}

const comprar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `❌ Debes indicar qué comprar.\n\n📌 Ejemplo: *.comprar escudo*\n\n💡 Usa *.shopcoins* para ver todos los ítems.`
            }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()
        const item = ITEMS[itemKey]

        if (!item) {
            await sock.sendMessage(jid, {
                text: `❌ Ítem no encontrado.\n\n💡 Usa *.shopcoins* para ver los ítems disponibles.`
            }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if ((rows[0].monedas || 0) < item.precio) {
            await sock.sendMessage(jid, {
                text: `❌ No tienes suficientes monedas.\n\n💰 *Precio:* ${item.precio} monedas\n💵 *Tu balance:* ${rows[0].monedas || 0} monedas`
            }, { quoted: mensaje })
            return
        }

        // Descontar monedas
        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [item.precio, userJid])

        // Lógica por ítem
        switch (itemKey) {
            case 'caja': {
                const premios = [50, 100, 200, 500, 1000, 2000]
                const premio = premios[Math.floor(Math.random() * premios.length)]
                await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [premio, userJid])
                await sock.sendMessage(jid, {
                    text: `🎁 *CAJA MISTERIOSA*\n\n¡Abriste la caja y encontraste *${premio} monedas*!\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - item.precio + premio} monedas`
                }, { quoted: mensaje })
                return
            }

            case 'marco': {
                await db.execute('UPDATE usuarios SET marco = 1 WHERE jid = ?', [userJid])
                await sock.sendMessage(jid, {
                    text: `🖼️ *MARCO ESPECIAL*\n\n✅ Tu perfil ahora tiene un marco especial.\n\nUsa *.perfil* para verlo.`
                }, { quoted: mensaje })
                return
            }

            case 'insignia': {
                await db.execute('INSERT INTO insignias (jid, nombre) VALUES (?, ?)', [userJid, '💎 Comprador Exclusivo'])
                await sock.sendMessage(jid, {
                    text: `🏅 *INSIGNIA EXCLUSIVA*\n\n✅ Obtuviste la insignia *💎 Comprador Exclusivo*.\n\nUsa *.insignias* para verla.`
                }, { quoted: mensaje })
                return
            }

            case 'ampliar_prestamo': {
                await db.execute('INSERT INTO items_activos (jid, item, expira) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 9999 DAY))', [userJid, 'ampliar_prestamo'])
                await sock.sendMessage(jid, {
                    text: `🏦 *LÍMITE AMPLIADO*\n\n✅ Tu límite de préstamo se duplicó a *10000 monedas*.`
                }, { quoted: mensaje })
                return
            }

            case 'reducir_interes': {
                await db.execute('INSERT INTO items_activos (jid, item, expira) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 9999 DAY))', [userJid, 'reducir_interes'])
                await sock.sendMessage(jid, {
                    text: `📉 *INTERÉS REDUCIDO*\n\n✅ El interés de tus préstamos bajó de 20% a 10%.`
                }, { quoted: mensaje })
                return
            }

            default: {
                // Items con duración (doble_xp, doble_work, escudo, pocion)
                const expira = new Date(Date.now() + item.duracion)
                await db.execute(
                    'INSERT INTO items_activos (jid, item, expira) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expira = ?',
                    [userJid, itemKey, expira, expira]
                )
                const horas = Math.floor(item.duracion / 3600000)
                const mins = Math.floor((item.duracion % 3600000) / 60000)
                const durTexto = horas > 0 ? `${horas}h` : `${mins}m`

                await sock.sendMessage(jid, {
                    text: `✅ *${item.nombre.toUpperCase()}*\n\nActivo por *${durTexto}*.\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - item.precio} monedas`
                }, { quoted: mensaje })
            }
        }
    }
}

export default comprar
