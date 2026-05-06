import db from './db.js'

const trabajos = [
    { texto: '🔧 Trabajaste como mecánico', ganancia: [100, 300] },
    { texto: '🍕 Repartiste pizzas', ganancia: [80, 200] },
    { texto: '💻 Programaste una app', ganancia: [200, 500] },
    { texto: '🚗 Fuiste conductor de taxi', ganancia: [100, 250] },
    { texto: '🏗️ Trabajaste en construcción', ganancia: [150, 350] },
    { texto: '📦 Repartiste paquetes', ganancia: [90, 180] },
    { texto: '🎨 Hiciste diseño gráfico', ganancia: [200, 400] },
    { texto: '🍔 Trabajaste en un restaurante', ganancia: [100, 220] },
]

const work = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        const [eco] = await db.execute('SELECT * FROM economia WHERE jid = ?', [userJid])

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        // Cooldown de 1 hora
        if (eco.length > 0 && eco[0].last_work) {
            const diff = Date.now() - new Date(eco[0].last_work).getTime()
            const restante = 3600000 - diff
            if (restante > 0) {
                const min = Math.floor(restante / 60000)
                const seg = Math.floor((restante % 60000) / 1000)
                await sock.sendMessage(jid, {
                    text: `⏳ Ya trabajaste hace poco.\n\n⌛ Podrás trabajar de nuevo en *${min}m ${seg}s*`
                }, { quoted: mensaje })
                return
            }
        }

        const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)]
        const ganancia = Math.floor(Math.random() * (trabajo.ganancia[1] - trabajo.ganancia[0] + 1)) + trabajo.ganancia[0]

        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [ganancia, userJid])

        if (eco.length === 0) {
            await db.execute('INSERT INTO economia (jid, last_work) VALUES (?, NOW())', [userJid])
        } else {
            await db.execute('UPDATE economia SET last_work = NOW() WHERE jid = ?', [userJid])
        }

        await sock.sendMessage(jid, {
            text: `💼 *TRABAJO*\n\n${trabajo.texto} y ganaste *${ganancia} monedas*.\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + ganancia} monedas`
        }, { quoted: mensaje })
    }
}

export default work
