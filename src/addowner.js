import db from './db.js'
import { esOwner, OWNER_PRINCIPAL } from './owners.js'

const addowner = {
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
                text: `❌ Uso correcto: *.addowner @usuario*`
            }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT id FROM usuarios WHERE jid = ?', [mencionado])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado.` }, { quoted: mensaje })
            return
        }

        const [yaEs] = await db.execute('SELECT id FROM owners WHERE jid = ?', [mencionado])
        if (yaEs.length > 0) {
            await sock.sendMessage(jid, { text: `⚠️ Ese usuario ya es Owner.` }, { quoted: mensaje })
            return
        }

        await db.execute('INSERT INTO owners (jid) VALUES (?)', [mencionado])

        await sock.sendMessage(jid, {
            text: `✅ *@${mencionado.split('@')[0]} ahora es Owner de Nexo-Bot.*`,
            mentions: [mencionado]
        }, { quoted: mensaje })

        try {
            await sock.sendMessage(mencionado, {
                text: `👑 *¡Felicidades!*\n\nFuiste añadido como *Owner de Nexo-Bot*.\nYa tienes acceso a todos los comandos del menú 19.`
            })
        } catch {}
    }
}

export default addowner
