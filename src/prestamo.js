import db from './db.js'

const INTERES_SISTEMA = 0.2
const MAX_PRESTAMO_SISTEMA = 5000
const MAX_PRESTAMOS_ACTIVOS = 3
const COOLDOWN_HORAS = 24

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
                await sock.sendMessage(jid, { text: `❌ Ya tienes *${MAX_PRESTAMOS_ACTIVOS} préstamos activos*. Paga alguno antes.` }, { quoted: mensaje })
                return
            }

            const [ultimoPrestamo] = await db.execute(
                'SELECT fecha FROM prestamos_usuarios WHERE jid_deudor = ? ORDER BY fecha DESC LIMIT 1',
                [userJid]
            )
            if (ultimoPrestamo.length > 0) {
                const diff = Date.now() - new Date(ultimoPrestamo[0].fecha).getTime()
                if (diff < COOLDOWN_HORAS * 3600000) {
                    const restante = Math.ceil((COOLDOWN_HORAS * 3600000 - diff) / 3600000)
                    await sock.sendMessage(jid, { text: `❌ Debes esperar *${restante} horas* más antes de pedir otro préstamo.` }, { quoted: mensaje })
                    return
                }
            }

            // 25% de interés en préstamos entre usuarios
            const deudaConInteres = Math.floor(cantidad * 1.25)

            await db.execute(
                'INSERT INTO prestamos_usuarios (jid_deudor, jid_prestamista, cantidad, deuda, estado) VALUES (?, ?, ?, ?, "pendiente")',
                [userJid, mencionado, cantidad, deudaConInteres]
            )

            await sock.sendMessage(jid, {
                text: `✅ Solicitud enviada a @${mencionado.split('@')[0]}.\n\n⚠️ Si es aceptada deberás devolver *${deudaConInteres} monedas* (25% de interés).\n⏳ Tienes *3 días* para pagar o la deuda aumentará un 5% diario.`,
                mentions: [mencionado]
            }, { quoted: mensaje })

            await sock.sendMessage(jid, {
                text: `👋 @${mencionado.split('@')[0]}! @${userJid.split('@')[0]} te pidió *${cantidad} monedas*.\n\n✅ *.aceptarprestamo* → aceptar\n❌ *.rechazarprestamo* → rechazar`,
                mentions: [mencionado, userJid]
            })
            return
        }

        // Préstamo del sistema
        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto:\n*.prestamo <cantidad>* → sistema\n*.prestamo @usuario <cantidad>* → usuario` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        // Verificar si tiene ampliar_prestamo activo
        const [ampliar] = await db.execute(
            'SELECT * FROM items_activos WHERE jid = ? AND item = "ampliar_prestamo" AND expira > NOW()',
            [userJid]
        )
        const limiteMax = ampliar.length > 0 ? 10000 : MAX_PRESTAMO_SISTEMA

        if (cantidad > limiteMax) {
            await sock.sendMessage(jid, { text: `❌ El préstamo máximo es *${limiteMax} monedas*.` }, { quoted: mensaje })
            return
        }

        const [prestamosSistema] = await db.execute(
            'SELECT * FROM prestamos WHERE jid = ? AND estado = "activo"', [userJid]
        )
        if (prestamosSistema.length > 0) {
            await sock.sendMessage(jid, { text: `❌ Ya tienes un préstamo activo de *${prestamosSistema[0].cantidad} monedas*.\n\nPágalo con *.pagar_prestamo <cantidad>*.` }, { quoted: mensaje })
            return
        }

        const [ultimoPrestamo] = await db.execute(
            'SELECT fecha FROM prestamos WHERE jid = ? ORDER BY fecha DESC LIMIT 1', [userJid]
        )
        if (ultimoPrestamo.length > 0) {
            const diff = Date.now() - new Date(ultimoPrestamo[0].fecha).getTime()
            if (diff < COOLDOWN_HORAS * 3600000) {
                const restante = Math.ceil((COOLDOWN_HORAS * 3600000 - diff) / 3600000)
                await sock.sendMessage(jid, { text: `❌ Debes esperar *${restante} horas* más.` }, { quoted: mensaje })
                return
            }
        }

        // Verificar reducir_interes activo
        const [reducir] = await db.execute(
            'SELECT * FROM items_activos WHERE jid = ? AND item = "reducir_interes" AND expira > NOW()',
            [userJid]
        )
        const interes = reducir.length > 0 ? 0.10 : INTERES_SISTEMA
        const deuda = Math.floor(cantidad * (1 + interes))

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cantidad, userJid])
        await db.execute('INSERT INTO prestamos (jid, cantidad, deuda) VALUES (?, ?, ?)', [userJid, cantidad, deuda])

        await sock.sendMessage(jid, {
            text: `💳 *PRÉSTAMO APROBADO*\n\n✅ Recibiste *${cantidad} monedas*.\n⚠️ Debes devolver *${deuda} monedas* (${interes * 100}% interés).\n\n💡 Usa *.pagar_prestamo <cantidad>* para pagar.`
        }, { quoted: mensaje })
    }
}

export default prestamo