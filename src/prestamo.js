import db from './db.js'

const INTERES_PRESTAMO = 0.2

const prestamo = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.prestamo <cantidad>*\n\n📌 Ejemplo: *.prestamo 1000*`
            }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])

        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        if (cantidad > 5000) {
            await sock.sendMessage(jid, { text: `❌ El préstamo máximo es de *5000 monedas*.` }, { quoted: mensaje })
            return
        }

        const [prestamos] = await db.execute(
            'SELECT * FROM prestamos WHERE jid = ? AND estado = "activo"',
            [userJid]
        )

        if (prestamos.length > 0) {
            await sock.sendMessage(jid, {
                text: `❌ Ya tienes un préstamo activo de *${prestamos[0].cantidad} monedas*.\n\nDebes pagarlo antes de solicitar otro.`
            }, { quoted: mensaje })
            return
        }

        const deuda = Math.floor(cantidad * (1 + INTERES_PRESTAMO))

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cantidad, userJid])
        await db.execute('INSERT INTO prestamos (jid, cantidad, deuda) VALUES (?, ?, ?)', [userJid, cantidad, deuda])

        await sock.sendMessage(jid, {
            text: `💳 *PRÉSTAMO APROBADO*\n\n✅ Recibiste *${cantidad} monedas*.\n\n⚠️ Debes devolver *${deuda} monedas* (20% de interés).\n\n💡 Usa *.pagarprestamo <cantidad>* para saldar tu deuda.`
        }, { quoted: mensaje })
    }
}

export default prestamo
