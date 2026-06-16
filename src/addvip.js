import db from './db.js'
import { esOwner } from './owners.js'

const addvip = {
    async ejecutar(sock, mensaje, args, esUltra = false) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
        const tipo = esUltra ? 'ultra' : 'normal'
        const nombreCmd = esUltra ? '.addvip-ultra' : '.addvip'

        if (!args[0] || !mencionado) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *${nombreCmd} <horas> @usuario*\n\n📌 Ejemplo: *${nombreCmd} 720 @usuario*`
            }, { quoted: mensaje })
            return
        }

        const horas = parseInt(args[0])
        if (isNaN(horas) || horas <= 0) {
            await sock.sendMessage(jid, { text: `❌ Las horas deben ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const expira = new Date(Date.now() + horas * 3600000)

        await db.execute(
            'UPDATE usuarios SET vip = 1, vip_tipo = ?, vip_expira = ? WHERE jid = ?',
            [tipo, expira, mencionado]
        )

        await sock.sendMessage(jid, {
            text: `👑 *VIP ASIGNADO*\n\n👤 *Usuario:* @${mencionado.split('@')[0]}\n💎 *Tipo:* ${tipo.toUpperCase()}\n⏳ *Duración:* ${horas} horas`,
            mentions: [mencionado]
        }, { quoted: mensaje })

        try {
            await sock.sendMessage(mencionado, {
                text: `👑 *¡Felicidades! Recibiste VIP ${tipo.toUpperCase()} en Nexo-Bot*\n\n⏳ *Duración:* ${horas} horas\n\nYa puedes usar todos los comandos de tu membresía. ✨`
            })
        } catch {}
    }
}

export default addvip
