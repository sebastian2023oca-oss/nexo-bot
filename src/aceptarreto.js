import db from './db.js'

const aceptarreto = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [retos] = await db.execute(
            'SELECT * FROM casino_retos WHERE jid_retado = ? AND estado = "pendiente" AND grupo_jid = ? ORDER BY fecha DESC LIMIT 1',
            [userJid, jid]
        )

        if (retos.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes retos pendientes en este grupo.` }, { quoted: mensaje })
            return
        }

        const reto = retos[0]

        const [retador] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [reto.jid_retador])
        const [retado] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])

        if ((retador[0]?.monedas || 0) < reto.cantidad) {
            await db.execute('UPDATE casino_retos SET estado = "cancelado" WHERE id = ?', [reto.id])
            await sock.sendMessage(jid, { text: `❌ El retador ya no tiene suficiente dinero. Reto cancelado.` }, { quoted: mensaje })
            return
        }

        if ((retado[0]?.monedas || 0) < reto.cantidad) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero para aceptar este reto de *${reto.cantidad} monedas*.` }, { quoted: mensaje })
            return
        }

        const ganaRetador = Math.random() < 0.5
        const ganador = ganaRetador ? reto.jid_retador : userJid
        const perdedor = ganaRetador ? userJid : reto.jid_retador

        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [reto.cantidad, perdedor])
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [reto.cantidad, ganador])
        await db.execute('UPDATE casino_retos SET estado = "aceptado" WHERE id = ?', [reto.id])

        await sock.sendMessage(jid, {
            text: `⚔️ *RETO RESUELTO*\n\n👤 @${reto.jid_retador.split('@')[0]} vs @${userJid.split('@')[0]}\n💰 *Cantidad:* ${reto.cantidad} monedas\n\n🏆 *Ganador:* @${ganador.split('@')[0]}\n💀 *Perdedor:* @${perdedor.split('@')[0]}`,
            mentions: [reto.jid_retador, userJid]
        }, { quoted: mensaje })
    }
}

export default aceptarreto
