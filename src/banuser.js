import db from './db.js'
import { esOwner, OWNER_PRINCIPAL } from './owners.js'

const banuser = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.banuser @usuario <motivo>*`
            }, { quoted: mensaje })
            return
        }

        if (mencionado === OWNER_PRINCIPAL) {
            await sock.sendMessage(jid, { text: `❌ No puedes banear al dueño de Nexo-Bot.` }, { quoted: mensaje })
            return
        }

        if (await esOwner(mencionado)) {
            await sock.sendMessage(jid, { text: `❌ No puedes banear a otro Owner.` }, { quoted: mensaje })
            return
        }

        const motivo = args.slice(1).join(' ') || 'Sin motivo especificado'

        const [yaBaneado] = await db.execute('SELECT id FROM usuarios_baneados WHERE jid = ?', [mencionado])
        if (yaBaneado.length > 0) {
            await sock.sendMessage(jid, { text: `⚠️ Ese usuario ya está baneado.` }, { quoted: mensaje })
            return
        }

        await db.execute('INSERT INTO usuarios_baneados (jid, motivo) VALUES (?, ?)', [mencionado, motivo])

        try {
            await sock.sendMessage(mencionado, {
                text: `🚫 *Has sido baneado de Nexo-Bot.*\n\n📋 *Motivo:* ${motivo}\n\nYa no podrás usar ningún comando del bot.`
            })
        } catch {}

        await sock.sendMessage(jid, {
            text: `🚫 *USUARIO BANEADO*\n\n👤 *Usuario:* @${mencionado.split('@')[0]}\n📋 *Motivo:* ${motivo}`,
            mentions: [mencionado]
        }, { quoted: mensaje })
    }
}

export default banuser
