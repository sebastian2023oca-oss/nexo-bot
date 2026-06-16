import db from './db.js'
import { esOwner } from './owners.js'

const aviso = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.aviso <mensaje>*\n\n📌 Ejemplo: *.aviso El bot estará en mantenimiento a las 10pm*`
            }, { quoted: mensaje })
            return
        }

        const mensajeAviso = args.join(' ')

        // Obtener todos los grupos donde el bot está (desde mensajes registrados)
        // Se envía el aviso en el grupo actual y se notifica que fue enviado globalmente
        const textoAviso = `📢 *AVISO DE NEXO BOT*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${mensajeAviso}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n👑 *Nexo Bot Staff*`

        await sock.sendMessage(jid, { text: textoAviso }, { quoted: mensaje })

        await sock.sendMessage(jid, {
            text: `✅ *Aviso enviado en este grupo.*\n\n💡 Para enviar avisos en más grupos, usa el comando en cada grupo.`
        }, { quoted: mensaje })
    }
}

export default aviso
