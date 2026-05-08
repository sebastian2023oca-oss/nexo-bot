import db from './db.js'
import { cobrarImpuesto } from './utils.js'

const INTERES_SISTEMA = 0.2
const MAX_PRESTAMO_SISTEMA = 5000
const MAX_PRESTAMOS_ACTIVOS = 3
const COOLDOWN_HORAS = 48

const prestamo = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        // Préstamo a otro usuario
        if (mencionado) {
            if (!args[1]) {
                await sock.sendMessage(jid, { text: `❌ Uso correcto: *.prestamo @usuario <cantidad>*` }, { quoted: mensaje })
                return
            }

            const cantidad = parseInt(args[1])
            if (isNaN(cantidad) || cantidad <= 0) {
                await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
                return
            }

            const [solicitante] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
            const [prestamista] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])

            if (solicitante.length === 0) {
                await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
                return
            }

            if (prestamista.length === 0) {
                await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado.` }, { quoted: mensaje })
                return
            }

            // Verificar máximo de préstamos activos
            const [prestamosActivos] = await db.execute(
                'SELECT COUNT(*) as total FROM prestamos_usuarios WHERE jid_deudor = ? AND estado = "activo"',
                [userJid]
            )
            const [prestamosSistema] = await db.execute(
                'SELECT COUNT(*) as total FROM prestamos WHERE jid = ? AND estado = "activo"',
                [userJid]
            )

            const totalActivos = (prestamosActivos[0].total || 0) + (prestamosSistema[0].total || 0)

            if (totalActivos >= MAX_PRESTAMOS_ACTIVOS) {
                await sock.sendMessage(jid, { text: `❌ Ya tienes *${MAX_PRESTAMOS_ACTIVOS} préstamos activos*.\n\nPaga alguno antes de solicitar otro.` }, { quoted: mensaje })
                return
            }

            // Verificar cooldown de 48h
            const [ultimoPrestamo] = await db.execute(
                'SELECT fecha FROM prestamos_usuarios WHERE jid_deudor = ? ORDER BY fecha DESC LIMIT 1',
                [userJid]
            )
            if (ultimoPrestamo.length > 0) {
                const diff = Date.now() - new Date(ultimoPrestamo[0].fecha).getTime()
                const horas = COOLDOWN_HORAS * 3600000
                if (diff < horas) {
                    const restante = Math.ceil((horas - diff) / 3600000)
                    await sock.sendMessage(jid, { text: `❌ Préstamo denegado porque hace poco hiciste/pagaste uno.\n\n⌛ Tiempo de espera: *${restante} horas* más.` }, { quoted: mensaje })
                    return
                }
            }

            // Guardar solicitud pendiente
            await db.execute(
                'INSERT INTO prestamos_usuarios (jid_deudor, jid_prestamista, cantidad, estado) VALUES (?, ?, ?, "pendiente")',
                [userJid, mencionado, cantidad]
            )

            await sock.sendMessage(jid, {
                text: `✅ Solicitud de préstamo enviada a @${mencionado.split('@')[0]}.`,
                mentions: [mencionado]
            }, { quoted: mensaje })

            await sock.sendMessage(jid, {
                text: `👋 Oye @${mencionado.split('@')[0]}! @${userJid.split('@')[0]} te pidió un préstamo de *${cantidad} monedas*.\n\n✅ *.aceptarprestamo* → aceptar\n❌ *.rechazarprestamo* → rechazar`,
                mentions: [mencionado, userJid]
            })

            return
        }

        // Préstamo del sistema
        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto:\n*.prestamo <cantidad>* → préstamo del sistema\n*.prestamo @usuario <cantidad>* → préstamo a usuario` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        if (cantidad > MAX_PRESTAMO_SISTEMA) {
            await sock.sendMessage(jid, { text: `❌ El préstamo máximo del sistema es *${MAX_PRESTAMO_SISTEMA} monedas*.` }, { quoted: mensaje })
            return
        }

        // Verificar préstamos activos
        const [prestamosActivos] = await db.execute(
            'SELECT COUNT(*) as total FROM prestamos_usuarios WHERE jid_deudor = ? AND estado = "activo"',
            [userJid]
        )
        const [prestamosSistema] = await db.execute(
            'SELECT * FROM prestamos WHERE jid = ? AND estado = "activo"',
            [userJid]
        )

        if (prestamosSistema.length > 0) {
            await sock.sendMessage(jid, { text: `❌ Ya tienes un préstamo activo del sistema de *${prestamosSistema[0].cantidad} monedas*.\n\nPágalo con *.pagar_prestamo <cantidad>*.` }, { quoted: mensaje })
            return
        }

        const totalActivos = (prestamosActivos[0].total || 0) + prestamosSistema.length

        if (totalActivos >= MAX_PRESTAMOS_ACTIVOS) {
            await sock.sendMessage(jid, { text: `❌ Ya tienes *${MAX_PRESTAMOS_ACTIVOS} préstamos activos*. Paga alguno primero.` }, { quoted: mensaje })
            return
        }

        // Verificar cooldown 48h
        const [ultimoPrestamo] = await db.execute(
            'SELECT fecha FROM prestamos WHERE jid = ? ORDER BY fecha DESC LIMIT 1',
            [userJid]
        )
        if (ultimoPrestamo.length > 0) {
            const diff = Date.now() - new Date(ultimoPrestamo[0].fecha).getTime()
            const horas = COOLDOWN_HORAS * 3600000
            if (diff < horas) {
                const restante = Math.ceil((horas - diff) / 3600000)
                await sock.sendMessage(jid, { text: `❌ Préstamo denegado porque hace poco hiciste/pagaste uno.\n\n⌛ Tiempo de espera: *${restante} horas* más.` }, { quoted: mensaje })
                return
            }
        }

        const deuda = Math.floor(cantidad * (1 + INTERES_SISTEMA))

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cantidad, userJid])
        await db.execute('INSERT INTO prestamos (jid, cantidad, deuda) VALUES (?, ?, ?)', [userJid, cantidad, deuda])

        await sock.sendMessage(jid, {
            text: `💳 *PRÉSTAMO APROBADO*\n\n✅ Recibiste *${cantidad} monedas* del sistema.\n⚠️ Debes devolver *${deuda} monedas* (20% de interés).\n\n💡 Usa *.pagar_prestamo <cantidad>* para saldar tu deuda.`
        }, { quoted: mensaje })
    }
}

export default prestamo