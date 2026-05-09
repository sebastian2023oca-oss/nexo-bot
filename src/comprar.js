import db from './db.js'

const ITEMS = {
    doble_xp:           { nombre: 'Doble XP', precio: 1000, duracion: 3600000 },
    doble_work:         { nombre: 'Doble Work', precio: 800, duracion: 3600000 },
    caja:               { nombre: 'Caja Misteriosa', precio: 300, duracion: null },
    escudo:             { nombre: 'Escudo Anti-Robo', precio: 5000, duracion: null },
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

        // Verificar préstamos activos
        const [prestamoSistema] = await db.execute(
            'SELECT * FROM prestamos WHERE jid = ? AND estado = "activo"', [userJid]
        )
        const [prestamosUsuarios] = await db.execute(
            'SELECT * FROM prestamos_usuarios WHERE jid_deudor = ? AND estado = "activo"', [userJid]
        )

        if (prestamoSistema.length > 0 || prestamosUsuarios.length > 0) {
            await sock.sendMessage(jid, {
                text: `❌ *Préstamo activo detectado.*\n\nPaga primero tu préstamo antes de comprar en la tienda.\n\n💡 Usa *.deuda* para ver tus deudas.`
            }, { quoted: mensaje })
            return
        }

        if ((rows[0].monedas || 0) < item.precio) {
            await sock.sendMessage(jid, {
                text: `❌ No tienes suficientes monedas.\n\n💰 *Precio:* ${item.precio} monedas\n💵 *Tu balance:* ${rows[0].monedas || 0} monedas`
            }, { quoted: mensaje })
            return
        }

        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [item.precio, userJid])

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
            case 'escudo': {
                const horas = Math.floor(Math.random() * 5) + 1
                const duracion = horas * 3600000
                const expira = new Date(Date.now() + duracion)
                await db.execute(
                    'INSERT INTO items_activos (jid, item, expira) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expira = ?',
                    [userJid, 'escudo', expira, expira]
                )
                await sock.sendMessage(jid, {
                    text: `🛡️ *ESCUDO ANTI-ROBO*\n\n✅ Activo por *${horas} hora${horas > 1 ? 's' : ''}* (aleatorio).\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - item.precio} monedas`
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
                await db.execute('INSERT INTO items_activos (jid, item, expira) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 9999 DAY)) ON DUPLICATE KEY UPDATE expira = DATE_ADD(NOW(), INTERVAL 9999 DAY)', [userJid, 'ampliar_prestamo'])
                await sock.sendMessage(jid, {
                    text: `🏦 *LÍMITE AMPLIADO*\n\n✅ Tu límite de préstamo se duplicó a *10000 monedas*.`
                }, { quoted: mensaje })
                return
            }
            case 'reducir_interes': {
                await db.execute('INSERT INTO items_activos (jid, item, expira) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 9999 DAY)) ON DUPLICATE KEY UPDATE expira = DATE_ADD(NOW(), INTERVAL 9999 DAY)', [userJid, 'reducir_interes'])
                await sock.sendMessage(jid, {
                    text: `📉 *INTERÉS REDUCIDO*\n\n✅ El interés de tus préstamos bajó de 20% a 10%.`
                }, { quoted: mensaje })
                return
            }
            default: {
                const expira = new Date(Date.now() + item.duracion)
                await db.execute(
                    'INSERT INTO items_activos (jid, item, expira) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expira = ?',
                    [userJid, itemKey, expira, expira]
                )
                const horas = Math.floor(item.duracion / 3600000)
                await sock.sendMessage(jid, {
                    text: `✅ *${item.nombre.toUpperCase()}*\n\nActivo por *${horas}h*.\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - item.precio} monedas`
                }, { quoted: mensaje })
            }
        }
    }
}

export default comprar