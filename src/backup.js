import { esOwner } from './owners.js'
import { exec } from 'child_process'

const backup = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        await sock.sendMessage(jid, { text: `⏳ *Generando backup de la base de datos...*` }, { quoted: mensaje })

        const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const archivo = `/root/bot/backups/nexobot_${fecha}.sql`

        exec(`mkdir -p /root/bot/backups && mysqldump -u nexobot -p1234bot nexobot > ${archivo}`, async (err) => {
            if (err) {
                await sock.sendMessage(jid, {
                    text: `❌ *Error al generar backup:*\n\n\`${err.message}\``
                }, { quoted: mensaje })
                return
            }

            await sock.sendMessage(jid, {
                text: `✅ *Backup generado exitosamente*\n\n📁 *Archivo:* \`${archivo}\`\n📅 *Fecha:* ${new Date().toLocaleString('es-CO')}`
            }, { quoted: mensaje })
        })
    }
}

export default backup
