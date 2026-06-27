import db from './db.js'

const atraparcaceria = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.atraparcaceria @usuario*` }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes cobrar la recompensa de ti mismo.` }, { quoted: mensaje })
            return
        }

        const [caceria] = await db.execute(
            'SELECT * FROM casino_caceria WHERE jid_objetivo = ? AND grupo_jid = ? AND activa = 1 ORDER BY id DESC LIMIT 1',
            [mencionado, jid]
        )

        if (caceria.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No hay cacerías activas sobre ese usuario.` }, { quoted: mensaje })
            return
        }

        const c = caceria[0]
        await db.execute('UPDATE casino_caceria SET activa = 0 WHERE id = ?', [c.id])
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [c.cantidad, userJid])

        await sock.sendMessage(jid, {
            text: `🏹 *¡CACERÍA COMPLETADA!*\n\n👤 @${userJid.split('@')[0]} atrapó a @${mencionado.split('@')[0]}\n💰 *Recompensa cobrada:* ${c.cantidad.toLocaleString()} monedas`,
            mentions: [userJid, mencionado]
        }, { quoted: mensaje })
    }
}

export default atraparcaceria