import db from './db.js'

const ruleta = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0] || !args[1]) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.ruleta <rojo/negro> <cantidad>*\n\n📌 Ejemplo: *.ruleta rojo 500*`
            }, { quoted: mensaje })
            return
        }

        const apuesta = args[0].toLowerCase()
        const cantidad = parseInt(args[1])

        if (!['rojo', 'negro'].includes(apuesta)) {
            await sock.sendMessage(jid, { text: `❌ Solo puedes apostar a *rojo* o *negro*.` }, { quoted: mensaje })
            return
        }

        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if ((rows[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, {
                text: `❌ No tienes suficiente dinero.\n\n💵 *Tu balance:* ${rows[0].monedas || 0} monedas`
            }, { quoted: mensaje })
            return
        }

        // Verificar poción de suerte activa
        const [pocion] = await db.execute(
            'SELECT * FROM items_activos WHERE jid = ? AND item = "pocion" AND expira > NOW()',
            [userJid]
        )
        const tienePocion = pocion.length > 0
        const probabilidad = tienePocion ? 0.65 : 0.5

        const resultado = Math.random() < probabilidad ? apuesta : (apuesta === 'rojo' ? 'negro' : 'rojo')
        const gano = resultado === apuesta

        if (gano) {
            await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cantidad, userJid])
        } else {
            await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cantidad, userJid])
        }

        const emoji = resultado === 'rojo' ? '🔴' : '⚫'
        const pocionTexto = tienePocion ? '\n🧪 *Poción de suerte activa* (+15% probabilidad)' : ''

        await sock.sendMessage(jid, {
            text: `🎡 *RULETA*\n\n${emoji} Cayó *${resultado}*${pocionTexto}\n\n${gano ? `✅ ¡Ganaste *${cantidad} monedas*!` : `❌ Perdiste *${cantidad} monedas*.`}\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) + (gano ? cantidad : -cantidad)} monedas`
        }, { quoted: mensaje })
    }
}

export default ruleta