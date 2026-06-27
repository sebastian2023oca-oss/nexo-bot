import db from './db.js'
import { asegurarTablasCasino } from './casinoUtils.js'

const retar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado || !args[args.length - 1]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.retar @usuario <cantidad>*` }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes retarte a ti mismo.` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[args.length - 1])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [retador] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        const [retado] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])

        if (retador.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
        if (retado.length === 0) { await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado.` }, { quoted: mensaje }); return }

        if ((retador[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero para retar con *${cantidad} monedas*.` }, { quoted: mensaje })
            return
        }

        const [pendientes] = await db.execute(
            'SELECT id FROM casino_retos WHERE jid_retador = ? AND jid_retado = ? AND estado = "pendiente"',
            [userJid, mencionado]
        )
        if (pendientes.length > 0) {
            await sock.sendMessage(jid, { text: `⚠️ Ya tienes un reto pendiente con ese usuario.` }, { quoted: mensaje })
            return
        }

        await db.execute(
            'INSERT INTO casino_retos (jid_retador, jid_retado, cantidad, tipo, grupo_jid) VALUES (?, ?, ?, "retar", ?)',
            [userJid, mencionado, cantidad, jid]
        )

        await sock.sendMessage(jid, {
            text: `⚔️ *RETO ENVIADO*\n\n👤 @${userJid.split('@')[0]} retó a @${mencionado.split('@')[0]}\n💰 *Cantidad:* ${cantidad} monedas\n\n✅ @${mencionado.split('@')[0]} usa *.aceptarreto* para aceptar\n❌ O *.cancelarreto* si quien retó quiere cancelar`,
            mentions: [userJid, mencionado]
        }, { quoted: mensaje })
    }
}

export default retar