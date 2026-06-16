import { esOwner } from './owners.js'
import { readFileSync, existsSync } from 'fs'

const pandabotlogs = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        // PM2 guarda logs en ~/.pm2/logs/
        const posiblesRutas = [
            '/root/.pm2/logs/nexo-bot-out.log',
            '/root/.pm2/logs/nexo-bot-error.log',
        ]

        let logTexto = ''

        for (const ruta of posiblesRutas) {
            if (existsSync(ruta)) {
                try {
                    const contenido = readFileSync(ruta, 'utf-8')
                    const ultimas = contenido.split('\n').slice(-30).join('\n')
                    logTexto += `📄 *${ruta.split('/').pop()}:*\n\`\`\`\n${ultimas}\n\`\`\`\n\n`
                } catch {}
            }
        }

        if (!logTexto) {
            logTexto = `⚠️ No se encontraron archivos de log en las rutas esperadas.\n\nRutas buscadas:\n${posiblesRutas.join('\n')}`
        }

        await sock.sendMessage(jid, {
            text: `🖥️ *NEXO BOT LOGS (últimas 30 líneas)*\n\n${logTexto}`
        }, { quoted: mensaje })
    }
}

export default pandabotlogs
