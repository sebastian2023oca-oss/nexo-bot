import db from './db.js'

const canjear = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.canjear <código>*` }, { quoted: mensaje })
            return
        }

        const codigo = args[0].toUpperCase()

        const [rows] = await db.execute(
            'SELECT * FROM codigos_canjeables WHERE codigo = ? AND activo = 1',
            [codigo]
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Código inválido o ya expirado.` }, { quoted: mensaje })
            return
        }

        const c = rows[0]

        if (c.usos_usados >= c.usos_max) {
            await sock.sendMessage(jid, { text: `❌ Este código ya agotó todos sus usos.` }, { quoted: mensaje })
            return
        }

        const [yaUso] = await db.execute(
            'SELECT id FROM codigos_usados WHERE codigo_id = ? AND jid = ?',
            [c.id, userJid]
        )

        if (yaUso.length > 0) {
            await sock.sendMessage(jid, { text: `❌ Ya canjeaste este código.` }, { quoted: mensaje })
            return
        }

        const [usuario] = await db.execute('SELECT monedas FROM usuarios WHERE jid = ?', [userJid])
        if (usuario.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        const nuevoValor = Math.max(0, (usuario[0].monedas || 0) + c.cantidad)
        await db.execute('UPDATE usuarios SET monedas = ? WHERE jid = ?', [nuevoValor, userJid])
        await db.execute('INSERT INTO codigos_usados (codigo_id, jid) VALUES (?, ?)', [c.id, userJid])
        await db.execute('UPDATE codigos_canjeables SET usos_usados = usos_usados + 1 WHERE id = ?', [c.id])

        if (c.usos_usados + 1 >= c.usos_max) {
            await db.execute('UPDATE codigos_canjeables SET activo = 0 WHERE id = ?', [c.id])
        }

        await sock.sendMessage(jid, {
            text: `🎟️ *CÓDIGO CANJEADO*\n\n✅ *${c.nombre}*\n💰 *${c.cantidad > 0 ? '+' : ''}${c.cantidad} monedas*\n\n💵 *Balance actual:* ${nuevoValor} monedas`
        }, { quoted: mensaje })
    }
}

export default canjear
