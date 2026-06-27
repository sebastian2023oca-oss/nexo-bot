import db from './db.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const venganza = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado || !args[args.length - 1]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.venganza @usuario <cantidad>*\n\n💡 Repite una apuesta contra quien te derrotó antes.` }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes vengarte de ti mismo.` }, { quoted: mensaje })
            return
        }

        // Verificar que el mencionado le haya ganado antes en algún juego PvP
        const [historial] = await db.execute(
            `SELECT * FROM casino_historial WHERE jid = ? AND resultado = "perdio"
             AND juego IN ('coinflipvs','blackjackvs','ruletavs','dueloapuesta','allin','retar')
             ORDER BY fecha DESC LIMIT 1`,
            [userJid]
        )

        if (historial.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes derrotas recientes en juegos PvP para vengarte.` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[args.length - 1])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [j1] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        const [j2] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])

        if (j1.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
        if (j2.length === 0) { await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado.` }, { quoted: mensaje }); return }

        if ((j1[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero.` }, { quoted: mensaje })
            return
        }
        if ((j2[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ @${mencionado.split('@')[0]} no tiene suficiente dinero.`, mentions: [mencionado] }, { quoted: mensaje })
            return
        }

        // Quien ejecuta el comando (el vengador, userJid) gana 30% de las veces
        const ganaVengador = Math.random() < 0.3
        const ganador = ganaVengador ? userJid : mencionado
        const perdedor = ganaVengador ? mencionado : userJid

        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cantidad, perdedor])
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cantidad, ganador])
        await registrarJugadaCasino(ganador, 'venganza', cantidad, 'gano', cantidad)
        await registrarJugadaCasino(perdedor, 'venganza', cantidad, 'perdio', -cantidad)

        await sock.sendMessage(jid, {
            text: `🗡️ *VENGANZA*\n\n@${userJid.split('@')[0]} buscó revancha contra @${mencionado.split('@')[0]}\n💰 *Apuesta:* ${cantidad} monedas\n\n${ganaVengador ? `🔥 *¡VENGANZA CUMPLIDA!*` : `😔 *La venganza falló de nuevo...*`}\n\n🏆 *Ganador:* @${ganador.split('@')[0]} (+${cantidad})\n💀 *Perdedor:* @${perdedor.split('@')[0]} (-${cantidad})`,
            mentions: [userJid, mencionado]
        }, { quoted: mensaje })
    }
}

export default venganza