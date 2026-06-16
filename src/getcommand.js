import { esOwner } from './owners.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const getcommand = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.getcommand <comando>*\n\n📌 Ejemplo: *.getcommand minar*`
            }, { quoted: mensaje })
            return
        }

        const cmd = args[0].toLowerCase().replace('.', '')

        try {
            const ruta = join(__dirname, `${cmd}.js`)
            const codigo = readFileSync(ruta, 'utf-8')
            const recortado = codigo.slice(0, 3000)

            await sock.sendMessage(jid, {
                text: `📄 *CÓDIGO: ${cmd}.js*\n\n\`\`\`\n${recortado}${codigo.length > 3000 ? '\n...(truncado)' : ''}\n\`\`\``
            }, { quoted: mensaje })
        } catch {
            await sock.sendMessage(jid, {
                text: `❌ No se encontró el archivo *${cmd}.js*`
            }, { quoted: mensaje })
        }
    }
}

export default getcommand
