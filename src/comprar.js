import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'

const ITEMS_SHOPCOINS = {
    doble_xp:           { nombre: 'Doble XP', precio: 1000, duracion: 3600000 },
    doble_work:         { nombre: 'Doble Work', precio: 800, duracion: 3600000 },
    caja:               { nombre: 'Caja Misteriosa', precio: 300, duracion: null },
    escudo:             { nombre: 'Escudo Anti-Robo', precio: 5000, duracion: null },
    pocion:             { nombre: 'Poción de Suerte', precio: 600, duracion: 18000000 },
    ampliar_prestamo:   { nombre: 'Ampliar Préstamo', precio: 1500, duracion: null },
    reducir_interes:    { nombre: 'Reducir Interés', precio: 1000, duracion: null },
    marco:              { nombre: 'Marco Especial', precio: 400, duracion: null },
    insignia:           { nombre: 'Insignia Exclusiva', precio: 700, duracion: null },
    ampliar_bodega:     { nombre: 'Ampliar Bodega +25', precio: 5000, duracion: null },
}

const comprar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `❌ Debes indicar qué comprar.\n\n📌 *.comprar <item>*\n\n💡 Usa *.shopcoins* para la tienda especial\n💡 Usa *.tienda* para la tienda general`
            }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'comprar', 20)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para comprar de nuevo.` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        // Verificar préstamos activos
        const [prestamoSistema] = await db.execute('SELECT * FROM prestamos WHERE jid = ? AND estado = "activo"', [userJid])
        const [prestamosUsuarios] = await db.execute('SELECT * FROM prestamos_usuarios WHERE jid_deudor = ? AND estado = "activo"', [userJid])

        if (prestamoSistema.length > 0 || prestamosUsuarios.length > 0) {
            await sock.sendMessage(jid, {
                text: `❌ *Préstamo activo detectado.*\n\nPaga primero tu préstamo antes de comprar.\n\n💡 Usa *.deuda* para ver tus deudas.`
            }, { quoted: mensaje })
            return
        }

        // Primero buscar en shopcoins
        const itemShop = ITEMS_SHOPCOINS[itemKey]
        if (itemShop) {
            if ((rows[0].monedas || 0) < itemShop.precio) {
                await sock.sendMessage(jid, {
                    text: `❌ No tienes suficientes monedas.\n\n💰 *Precio:* ${itemShop.precio} monedas\n💵 *Tu balance:* ${rows[0].monedas || 0} monedas`
                }, { quoted: mensaje })
                return
            }

            await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [itemShop.precio, userJid])

            switch (itemKey) {
                case 'caja': {
                    const premios = [50, 100, 200, 500, 1000, 2000]
                    const premio = premios[Math.floor(Math.random() * premios.length)]
                    await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [premio, userJid])
                    await registrarCooldown(userJid, 'comprar', 20)
                    await sock.sendMessage(jid, { text: `🎁 *CAJA MISTERIOSA*\n\n¡Encontraste *${premio} monedas*!\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - itemShop.precio + premio} monedas` }, { quoted: mensaje })
                    return
                }
                case 'escudo': {
                    const horas = Math.floor(Math.random() * 5) + 1
                    const expira = new Date(Date.now() + horas * 3600000)
                    await db.execute('INSERT INTO items_activos (jid, item, expira) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expira = ?', [userJid, 'escudo', expira, expira])
                    await registrarCooldown(userJid, 'comprar', 20)
                    await sock.sendMessage(jid, { text: `🛡️ *ESCUDO ANTI-ROBO*\n\n✅ Activo por *${horas} hora${horas > 1 ? 's' : ''}*.\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - itemShop.precio} monedas` }, { quoted: mensaje })
                    return
                }
                case 'marco': {
                    await db.execute('UPDATE usuarios SET marco = 1 WHERE jid = ?', [userJid])
                    await registrarCooldown(userJid, 'comprar', 20)
                    await sock.sendMessage(jid, { text: `🖼️ *MARCO ESPECIAL*\n\n✅ Tu perfil ahora tiene un marco especial.` }, { quoted: mensaje })
                    return
                }
                case 'insignia': {
                    await db.execute('INSERT INTO insignias (jid, nombre) VALUES (?, ?)', [userJid, '💎 Comprador Exclusivo'])
                    await registrarCooldown(userJid, 'comprar', 20)
                    await sock.sendMessage(jid, { text: `🏅 *INSIGNIA EXCLUSIVA*\n\n✅ Obtuviste la insignia *💎 Comprador Exclusivo*.` }, { quoted: mensaje })
                    return
                }
                case 'ampliar_prestamo': {
                    await db.execute('INSERT INTO items_activos (jid, item, expira) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 9999 DAY)) ON DUPLICATE KEY UPDATE expira = DATE_ADD(NOW(), INTERVAL 9999 DAY)', [userJid, 'ampliar_prestamo'])
                    await registrarCooldown(userJid, 'comprar', 20)
                    await sock.sendMessage(jid, { text: `🏦 *LÍMITE AMPLIADO*\n\n✅ Tu límite de préstamo se duplicó a *10000 monedas*.` }, { quoted: mensaje })
                    return
                }
                case 'reducir_interes': {
                    await db.execute('INSERT INTO items_activos (jid, item, expira) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 9999 DAY)) ON DUPLICATE KEY UPDATE expira = DATE_ADD(NOW(), INTERVAL 9999 DAY)', [userJid, 'reducir_interes'])
                    await registrarCooldown(userJid, 'comprar', 20)
                    await sock.sendMessage(jid, { text: `📉 *INTERÉS REDUCIDO*\n\n✅ El interés de tus préstamos bajó de 20% a 10%.` }, { quoted: mensaje })
                    return
                }
                case 'ampliar_bodega': {
                    await db.execute('UPDATE usuarios SET bodega_max = bodega_max + 25 WHERE jid = ?', [userJid])
                    await registrarCooldown(userJid, 'comprar', 20)
                    const [updated] = await db.execute('SELECT bodega_max FROM usuarios WHERE jid = ?', [userJid])
                    await sock.sendMessage(jid, { text: `🏠 *BODEGA AMPLIADA*\n\n✅ Tu bodega ahora tiene capacidad para *${updated[0].bodega_max} ítems*.` }, { quoted: mensaje })
                    return
                }
                default: {
                    const expira = new Date(Date.now() + itemShop.duracion)
                    await db.execute('INSERT INTO items_activos (jid, item, expira) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expira = ?', [userJid, itemKey, expira, expira])
                    const horas = Math.floor(itemShop.duracion / 3600000)
                    await registrarCooldown(userJid, 'comprar', 0)
                    await sock.sendMessage(jid, { text: `✅ *${itemShop.nombre.toUpperCase()}*\n\nActivo por *${horas}h*.\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - itemShop.precio} monedas` }, { quoted: mensaje })
                    return
                }
            }
        }

        // Buscar en tienda general
        const [tiendaRows] = await db.execute('SELECT * FROM tienda WHERE item = ?', [itemKey])

        if (tiendaRows.length === 0) {
            await sock.sendMessage(jid, {
                text: `❌ Ítem no encontrado.\n\n💡 Usa *.shopcoins* o *.tienda* para ver los ítems disponibles.`
            }, { quoted: mensaje })
            return
        }

        const itemTienda = tiendaRows[0]

        if (itemTienda.stock <= 0) {
            await sock.sendMessage(jid, { text: `❌ *${itemTienda.nombre}* está agotado.\n\n⏳ El stock se restablece cada 3 horas.` }, { quoted: mensaje })
            return
        }

        if ((rows[0].monedas || 0) < itemTienda.precio) {
            await sock.sendMessage(jid, {
                text: `❌ No tienes suficientes monedas.\n\n💰 *Precio:* ${itemTienda.precio.toLocaleString()} monedas\n💵 *Tu balance:* ${rows[0].monedas || 0} monedas`
            }, { quoted: mensaje })
            return
        }

        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [itemTienda.precio, userJid])
        await db.execute('UPDATE tienda SET stock = stock - 1 WHERE id = ?', [itemTienda.id])

        const [yaExiste] = await db.execute('SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?', [userJid, itemKey])
        if (yaExiste.length > 0) {
            await db.execute('UPDATE inventario_usuario SET cantidad = cantidad + 1 WHERE jid = ? AND item = ?', [userJid, itemKey])
        } else {
            await db.execute('INSERT INTO inventario_usuario (jid, item, cantidad) VALUES (?, ?, 1)', [userJid, itemKey])
        }

        await db.execute('INSERT INTO historico_items (jid, accion, item, precio) VALUES (?, "comprar", ?, ?)', [userJid, itemKey, itemTienda.precio])
        await registrarCooldown(userJid, 'comprar', 20)

        await sock.sendMessage(jid, {
            text: `🛒 *COMPRA EXITOSA*\n\n✅ Compraste *${itemTienda.nombre}*.\n💰 *Pagado:* ${itemTienda.precio.toLocaleString()} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - itemTienda.precio} monedas\n\n💡 Usa *.inventario* para ver tus ítems.`
        }, { quoted: mensaje })
    }
}

export default comprar