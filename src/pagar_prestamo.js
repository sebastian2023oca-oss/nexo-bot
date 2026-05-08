import db from './db.js'
import { cobrarImpuesto } from './utils.js'

const pagar_prestamo = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.pagar_prestamo <cantidad>*` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [prestamos] = await db.execute(
            'SELECT * FROM prestamos WHERE jid = ? AND estado = "activo"',
            [userJid]
        )

        if (prestamos.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes préstamos activos con el sistema.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if ((rows[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero.\n\n💵 *Tu balance:* ${rows[0].monedas || 0} monedas\n💳 *Deuda:* ${prestamos[0].deuda} monedas` }, { quoted: mensaje })
            return
        }

        const deudaRestante = prestamos[0].deuda - cantidad

        const impuesto = await cobrarImpuesto(userJid, rows[0].monedas)
        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cantidad, userJid])

        if (deudaRestante <= 0) {
            await db.execute('UPDATE prestamos SET estado = "pagado" WHERE jid = ? AND estado = "activo"', [userJid])
            await sock.sendMessage(jid, {
                text: `✅ *PRÉSTAMO PAGADO*\n\n🎉 Pagaste tu deuda completamente.\n💸 *Pagado:* ${cantidad} monedas\n💸 *Impuesto (0.1%):* -${impuesto} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - cantidad - impuesto} monedas`
            }, { quoted: mensaje })
        } else {
            await db.execute('UPDATE prestamos SET deuda = ? WHERE jid = ? AND estado = "activo"', [deudaRestante, userJid])
            await sock.sendMessage(jid, {
                text: `💳 *PAGO PARCIAL*\n\n✅ Pagaste *${cantidad} monedas*.\n💸 *Impuesto (0.5%):* -${impuesto} monedas\n⚠️ *Deuda restante:* ${deudaRestante} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - cantidad - impuesto} monedas`
            }, { quoted: mensaje })
        }
    }
}

export default pagar_prestamo
