import db from './db.js'

const reycasino = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [reyRows] = await db.execute('SELECT * FROM casino_rey WHERE id = 1')
        const rey = reyRows[0]

        if (!rey.jid_rey) {
            // No hay rey, este usuario se vuelve rey gratis
            await db.execute('UPDATE casino_rey SET jid_rey = ?, defensas = 0, actualizado = NOW() WHERE id = 1', [userJid])
            await sock.sendMessage(jid, {
                text: `👑 *¡NUEVO REY DEL CASINO!*\n\n@${userJid.split('@')[0]} reclamó el trono sin oposición.\n\n💡 Cualquiera puede retarlo con *.reycasino <cantidad>*`,
                mentions: [userJid]
            }, { quoted: mensaje })
            return
        }

        if (rey.jid_rey === userJid) {
            await sock.sendMessage(jid, {
                text: `👑 *Ya eres el Rey del Casino.*\n\n🛡️ *Defensas exitosas:* ${rey.defensas}`
            }, { quoted: mensaje })
            return
        }

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `👑 *REY DEL CASINO ACTUAL:* @${rey.jid_rey.split('@')[0]}\n🛡️ *Defensas:* ${rey.defensas}\n\n📌 Usa *.reycasino <cantidad>* para retarlo.`,
                mentions: [rey.jid_rey]
            }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [retador] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        const [reyUsuario] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [rey.jid_rey])

        if (retador.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
        if ((retador[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero para retar con esa cantidad.` }, { quoted: mensaje })
            return
        }
        if (reyUsuario.length === 0 || (reyUsuario[0].monedas || 0) < cantidad) {
            // El rey no puede cubrir la apuesta, pierde el trono automáticamente
            await db.execute('UPDATE casino_rey SET jid_rey = ?, defensas = 0, actualizado = NOW() WHERE id = 1', [userJid])
            await sock.sendMessage(jid, {
                text: `👑 *¡NUEVO REY!*\n\nEl rey anterior no pudo cubrir el reto.\n@${userJid.split('@')[0]} es el nuevo Rey del Casino.`,
                mentions: [userJid]
            }, { quoted: mensaje })
            return
        }

        // El retador (quien ejecuta el comando) gana 30% de las veces
        const ganaRetador = Math.random() < 0.3
        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cantidad, ganaRetador ? rey.jid_rey : userJid])
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cantidad, ganaRetador ? userJid : rey.jid_rey])

        if (ganaRetador) {
            await db.execute('UPDATE casino_rey SET jid_rey = ?, defensas = 0, actualizado = NOW() WHERE id = 1', [userJid])
            await sock.sendMessage(jid, {
                text: `👑💥 *¡EL TRONO HA CAÍDO!*\n\n@${userJid.split('@')[0]} derrotó a @${rey.jid_rey.split('@')[0]} y es el nuevo Rey del Casino.\n💰 *Ganó:* ${cantidad.toLocaleString()} monedas`,
                mentions: [userJid, rey.jid_rey]
            }, { quoted: mensaje })
        } else {
            await db.execute('UPDATE casino_rey SET defensas = defensas + 1, actualizado = NOW() WHERE id = 1')
            await sock.sendMessage(jid, {
                text: `👑🛡️ *¡EL REY DEFIENDE SU TRONO!*\n\n@${rey.jid_rey.split('@')[0]} venció a @${userJid.split('@')[0]}\n💰 *Ganó:* ${cantidad.toLocaleString()} monedas\n🛡️ *Defensas totales:* ${rey.defensas + 1}`,
                mentions: [userJid, rey.jid_rey]
            }, { quoted: mensaje })
        }
    }
}

export default reycasino