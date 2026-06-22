import db from './db.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const allin = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.allin @usuario*\n\n⚠️ Ambos arriesgan TODO su dinero en mano.` }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes jugar contra ti mismo.` }, { quoted: mensaje })
            return
        }

        const [j1] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        const [j2] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])

        if (j1.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
        if (j2.length === 0) { await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado.` }, { quoted: mensaje }); return }

        const monedas1 = j1[0].monedas || 0
        const monedas2 = j2[0].monedas || 0

        if (monedas1 <= 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes dinero en mano para arriesgar.` }, { quoted: mensaje })
            return
        }
        if (monedas2 <= 0) {
            await sock.sendMessage(jid, { text: `❌ @${mencionado.split('@')[0]} no tiene dinero en mano para arriesgar.`, mentions: [mencionado] }, { quoted: mensaje })
            return
        }

        // Solo se arriesga el monto menor entre ambos (lo que el más pobre pueda perder)
        const apuesta = Math.min(monedas1, monedas2)

        const ganaJ1 = Math.random() < 0.5
        const ganador = ganaJ1 ? userJid : mencionado
        const perdedor = ganaJ1 ? mencionado : userJid

        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [apuesta, perdedor])
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [apuesta, ganador])
        await registrarJugadaCasino(ganador, 'allin', apuesta, 'gano', apuesta)
        await registrarJugadaCasino(perdedor, 'allin', apuesta, 'perdio', -apuesta)

        await sock.sendMessage(jid, {
            text: `🔥 *¡ALL IN!* 🔥\n\n@${userJid.split('@')[0]} vs @${mencionado.split('@')[0]}\n💰 *Lo arriesgado:* ${apuesta.toLocaleString()} monedas\n\n🏆 *GANADOR:* @${ganador.split('@')[0]} (+${apuesta.toLocaleString()})\n💀 *PERDEDOR:* @${perdedor.split('@')[0]} (-${apuesta.toLocaleString()})\n\n😱 ¡Todo o nada!`,
            mentions: [userJid, mencionado]
        }, { quoted: mensaje })
    }
}

export default allin
