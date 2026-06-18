import db from './db.js'
import { esOwner } from './owners.js'

const CANTIDAD_MAX = 100000000

const violar = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.violar @usuario*`
            }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes violar a ti mismo.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado.` }, { quoted: mensaje })
            return
        }

        const monedas = rows[0].monedas || 0
        const banco = rows[0].banco || 0
        const totalDisponible = monedas + banco

        let quitadoMano = 0
        let quitadoBanco = 0
        let texto = ''

        if (totalDisponible === 0) {
            await sock.sendMessage(jid, {
                text: `🕵️ *¡VIOLADO!*\n\n@${mencionado.split('@')[0]} fue violado... pero está en la ruina total. 💀\n\n💵 No tenía nada que quitarle.`,
                mentions: [mencionado]
            }, { quoted: mensaje })
            return
        }

        if (totalDisponible >= CANTIDAD_MAX) {
            // Tiene suficiente: se le quitan exactamente 100 millones
            if (monedas >= CANTIDAD_MAX) {
                // Todo de la mano
                quitadoMano = CANTIDAD_MAX
                await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [CANTIDAD_MAX, mencionado])
            } else {
                // Primero se vacía la mano, el resto del banco
                quitadoMano = monedas
                quitadoBanco = CANTIDAD_MAX - monedas
                await db.execute('UPDATE usuarios SET monedas = 0, banco = banco - ? WHERE jid = ?', [quitadoBanco, mencionado])
            }
            texto = `🕵️ *¡LO VIOLASTE!*\n\n@${mencionado.split('@')[0]} fue violado en pleno crimen.\n\n💰 *Se le quitaron exactamente 100,000,000 monedas*\n${quitadoMano > 0 ? `💵 Del bolsillo: -${quitadoMano.toLocaleString()}\n` : ''}${quitadoBanco > 0 ? `🏦 Del banco: -${quitadoBanco.toLocaleString()}\n` : ''}\n💸 *¡Justicia servida!* 🚔`
        } else {
            // No tiene 100M: se le quita TODO lo que tiene
            quitadoMano = monedas
            quitadoBanco = banco
            await db.execute('UPDATE usuarios SET monedas = 0, banco = 0 WHERE jid = ?', [mencionado])
            texto = `🕵️ *¡LO VIOLASTE!*\n\n@${mencionado.split('@')[0]} fue violado pero no tenía 100,000,000.\n\n💀 *Se le quitó TODO lo que tenía:*\n${quitadoMano > 0 ? `💵 Del bolsillo: -${quitadoMano.toLocaleString()}\n` : ''}${quitadoBanco > 0 ? `🏦 Del banco: -${quitadoBanco.toLocaleString()}\n` : ''}\n💰 *Total confiscado: ${totalDisponible.toLocaleString()} monedas*\n\n😂 ¡Quedó en la calle! 🚔`
        }

        await sock.sendMessage(jid, {
            text: texto,
            mentions: [mencionado]
        }, { quoted: mensaje })

        // Notificar al atrapado
        try {
            await sock.sendMessage(mencionado, {
                text: `🚔 *¡FUISTE VIOLADO!*\n\nUn Owner te violó y te confiscó *${Math.min(totalDisponible, CANTIDAD_MAX).toLocaleString()} monedas*.\n\n¡Más suerte la próxima vez! 💀`
            })
        } catch {}
    }
}

export default atrapar
