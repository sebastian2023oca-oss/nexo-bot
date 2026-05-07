import db from './db.js'

const robar = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, {
                text: `❌ Debes mencionar a un usuario.\n\n📌 Ejemplo: *.robar @usuario*`
            }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes robarte a ti mismo.` }, { quoted: mensaje })
            return
        }

        const [robador] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        const [victima] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])

        if (robador.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if (victima.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado.` }, { quoted: mensaje })
            return
        }

        if ((victima[0].monedas || 0) === 0) {
            await sock.sendMessage(jid, { text: `❌ Esa persona no tiene dinero en mano.` }, { quoted: mensaje })
            return
        }

        // Verificar escudo de la víctima
        const [escudo] = await db.execute(
            'SELECT * FROM items_activos WHERE jid = ? AND item = "escudo" AND expira > NOW()',
            [mencionado]
        )

        if (escudo.length > 0) {
            await sock.sendMessage(jid, {
                text: `🛡️ *¡ROBO BLOQUEADO!*\n\n@${mencionado.split('@')[0]} tiene un escudo anti-robo activo.\n\n❌ No pudiste robarle nada.`,
                mentions: [mencionado]
            }, { quoted: mensaje })
            return
        }

        // 40% éxito, 60% fallo
        const exito = Math.random() < 0.4

        if (exito) {
            const robado = Math.floor((victima[0].monedas || 0) * (Math.random() * 0.3 + 0.1))
            await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [robado, userJid])
            await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [robado, mencionado])

            await sock.sendMessage(jid, {
                text: `🦹 *¡ROBO EXITOSO!*\n\nLe robaste *${robado} monedas* a @${mencionado.split('@')[0]}.\n\n💵 *Tu balance:* ${(robador[0].monedas || 0) + robado} monedas`,
                mentions: [mencionado]
            }, { quoted: mensaje })
        } else {
            const multa = Math.floor((robador[0].monedas || 0) * 0.1)
            if (multa > 0) {
                await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [multa, userJid])
            }

            await sock.sendMessage(jid, {
                text: `👮 *¡TE ATRAPARON!*\n\nIntentaste robarle a @${mencionado.split('@')[0]} pero fallaste.\n\n❌ Pagaste una multa de *${multa} monedas*.\n\n💵 *Tu balance:* ${(robador[0].monedas || 0) - multa} monedas`,
                mentions: [mencionado]
            }, { quoted: mensaje })
        }
    }
}

export default robar