import db from './db.js'

const interes = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        const [eco] = await db.execute('SELECT * FROM economia WHERE jid = ?', [userJid])

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if ((rows[0].banco || 0) === 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes dinero en el banco para generar interés.` }, { quoted: mensaje })
            return
        }

        // Cooldown de 8 horas
        if (eco.length > 0 && eco[0].last_interes) {
            const diff = Date.now() - new Date(eco[0].last_interes).getTime()
            const restante = 28800000 - diff
            if (restante > 0) {
                const hrs = Math.floor(restante / 3600000)
                const min = Math.floor((restante % 3600000) / 60000)
                await sock.sendMessage(jid, {
                    text: `⏳ Ya generaste interés recientemente.\n\n⌛ Podrás generarlo de nuevo en *${hrs}h ${min}m*`
                }, { quoted: mensaje })
                return
            }
        }

        const ganancia = Math.floor((rows[0].banco || 0) * 0.05)

        await db.execute('UPDATE usuarios SET banco = banco + ? WHERE jid = ?', [ganancia, userJid])

        if (eco.length === 0) {
            await db.execute('INSERT INTO economia (jid, last_interes) VALUES (?, NOW())', [userJid])
        } else {
            await db.execute('UPDATE economia SET last_interes = NOW() WHERE jid = ?', [userJid])
        }

        await sock.sendMessage(jid, {
            text: `📈 *INTERÉS BANCARIO*\n\n✅ Generaste *${ganancia} monedas* de interés (5%).\n\n🏦 *Banco actual:* ${(rows[0].banco || 0) + ganancia} monedas\n\n⌛ Próximo interés disponible en 8 horas.`
        }, { quoted: mensaje })
    }
}

export default interes
