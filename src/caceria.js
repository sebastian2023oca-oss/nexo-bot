import db from './db.js'
import { esOwner } from './owners.js'

const caceria = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado || !args[args.length - 1]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.caceria @usuario <cantidad>*\n\n💡 Coloca una recompensa virtual sobre un jugador. El primero en usar *.atraparcaceria @usuario* se la lleva.` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[args.length - 1])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [creador] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (creador.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
        if ((creador[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero para esa recompensa.` }, { quoted: mensaje })
            return
        }

        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cantidad, userJid])
        await db.execute(
            'INSERT INTO casino_caceria (jid_objetivo, jid_creador, cantidad, grupo_jid) VALUES (?, ?, ?, ?)',
            [mencionado, userJid, cantidad, jid]
        )

        await sock.sendMessage(jid, {
            text: `🎯 *CACERÍA INICIADA*\n\n👤 *Objetivo:* @${mencionado.split('@')[0]}\n💰 *Recompensa:* ${cantidad.toLocaleString()} monedas\n\n🏹 ¡El primero en usar *.atraparcaceria @${mencionado.split('@')[0]}* se lleva el premio!`,
            mentions: [mencionado]
        }, { quoted: mensaje })
    }
}

export default caceria
