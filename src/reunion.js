import db from './db.js'
import { esOwner } from './owners.js'

const reunion = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.reunion <mensaje>*\n\n📌 Ejemplo: *.reunion Reunión de owners a las 8pm*`
            }, { quoted: mensaje })
            return
        }

        const mensajeReunion = args.join(' ')

        const [owners] = await db.execute('SELECT jid FROM owners')

        let enviados = 0
        for (const owner of owners) {
            if (owner.jid === userJid) continue
            try {
                await sock.sendMessage(owner.jid, {
                    text: `👑 *CONVOCATORIA DE OWNERS*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${mensajeReunion}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 Nexo-Bot Staff`
                })
                enviados++
            } catch {}
        }

        await sock.sendMessage(jid, {
            text: `✅ *Convocatoria enviada a ${enviados} owner(s).*`
        }, { quoted: mensaje })
    }
}

export default reunion
