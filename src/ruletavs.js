import db from './db.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const ruletavs = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado || !args[args.length - 1]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.ruletavs @usuario <cantidad>*` }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes jugar contra ti mismo.` }, { quoted: mensaje })
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

        // Retador (userJid) gana 30% de las veces
        const ganaJ1 = Math.random() < 0.3
        const ganador = ganaJ1 ? userJid : mencionado
        const perdedor = ganaJ1 ? mencionado : userJid
        const color = Math.random() < 0.5 ? '🔴 Rojo' : '⚫ Negro'

        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cantidad, perdedor])
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cantidad, ganador])
        await registrarJugadaCasino(ganador, 'ruletavs', cantidad, 'gano', cantidad)
        await registrarJugadaCasino(perdedor, 'ruletavs', cantidad, 'perdio', -cantidad)

        await sock.sendMessage(jid, {
            text: `🎡 *RULETA VS*\n\n@${userJid.split('@')[0]} vs @${mencionado.split('@')[0]}\n💰 *Apuesta:* ${cantidad} monedas\n\n🎯 *Cayó en:* ${color}\n\n🏆 *Ganador:* @${ganador.split('@')[0]} (+${cantidad})\n💀 *Perdedor:* @${perdedor.split('@')[0]} (-${cantidad})`,
            mentions: [userJid, mencionado]
        }, { quoted: mensaje })
    }
}

export default ruletavs