import { esOwner } from './owners.js'
import { exec } from 'child_process'

const reiniciar = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        await sock.sendMessage(jid, {
            text: `🔄 *Reiniciando Nexo-Bot...*\n\n⏳ Vuelve en unos segundos.`
        }, { quoted: mensaje })

        setTimeout(() => {
            exec('pm2 restart nexo-bot', (err) => {
                if (err) console.error('Error al reiniciar:', err.message)
            })
        }, 2000)
    }
}

export default reiniciar
