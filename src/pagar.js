import db from './db.js'

const pagar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado || !args[1]) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.pagar @usuario <cantidad>*\n\n📌 Ejemplo: *.pagar @juan 500*`
            }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes pagarte a ti mismo.` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[1])

        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [sender] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        const [receiver] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])

        if (sender.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if (receiver.length === 0) {
            await sock.sendMessage(jid, { text: `❌ El usuario mencionado no está registrado.` }, { quoted: mensaje })
            return
        }

        if ((sender[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, {
                text: `❌ No tienes suficiente dinero.\n\n💵 *Tu balance:* ${sender[0].monedas || 0} monedas`
            }, { quoted: mensaje })
            return
        }

        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cantidad, userJid])
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cantidad, mencionado])

        await sock.sendMessage(jid, {
            text: `✅ *PAGO REALIZADO*\n\n💸 Pagaste *${cantidad} monedas* a @${mencionado.split('@')[0]}\n\n💵 *Tu balance:* ${(sender[0].monedas || 0) - cantidad} monedas`,
            mentions: [mencionado]
        }, { quoted: mensaje })
    }
}

export default pagar
