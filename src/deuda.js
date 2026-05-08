import db from './db.js'

const deuda = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [prestamoSistema] = await db.execute(
            'SELECT * FROM prestamos WHERE jid = ? AND estado = "activo"',
            [userJid]
        )
        const [prestamosUsuarios] = await db.execute(
            'SELECT * FROM prestamos_usuarios WHERE jid_deudor = ? AND estado = "activo"',
            [userJid]
        )

        if (prestamoSistema.length === 0 && prestamosUsuarios.length === 0) {
            await sock.sendMessage(jid, { text: `✅ *No tienes deudas activas.* 🎉` }, { quoted: mensaje })
            return
        }

        let texto = `💳 *TUS DEUDAS ACTIVAS*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

        if (prestamoSistema.length > 0) {
            texto += `🏦 *Préstamo del sistema:*\n💰 Deuda: *${prestamoSistema[0].deuda} monedas*\n\n`
        }

        for (const p of prestamosUsuarios) {
            texto += `👤 *Préstamo de @${p.jid_prestamista.split('@')[0]}:*\n💰 Cantidad: *${p.cantidad} monedas*\n\n`
        }

        texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default deuda
