import db from './db.js'
import { esOwner } from './owners.js'

const reply = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        if (!args[0] || !args[1]) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.reply <ID> <respuesta>*\n\n📌 Ejemplo: *.reply 5 Gracias por tu sugerencia, será implementada pronto.*`
            }, { quoted: mensaje })
            return
        }

        const id = parseInt(args[0])
        const respuesta = args.slice(1).join(' ')

        if (isNaN(id)) {
            await sock.sendMessage(jid, { text: `❌ El ID debe ser un número.` }, { quoted: mensaje })
            return
        }

        // Buscar sugerencia/reporte en tabla (si existe)
        try {
            const [rows] = await db.execute('SELECT * FROM sugerencias WHERE id = ?', [id])
            if (rows.length === 0) {
                await sock.sendMessage(jid, { text: `❌ No existe la sugerencia/reporte #${id}.` }, { quoted: mensaje })
                return
            }

            const sugerencia = rows[0]

            await sock.sendMessage(jid, {
                text: `✅ *Respuesta enviada a @${sugerencia.jid.split('@')[0]}*`,
                mentions: [sugerencia.jid]
            }, { quoted: mensaje })

            try {
                await sock.sendMessage(sugerencia.jid, {
                    text: `📬 *Respuesta de Nexo-Bot Staff*\n\n📋 *Tu reporte/sugerencia #${id}:*\n_${sugerencia.texto}_\n\n💬 *Respuesta:*\n${respuesta}`
                })
            } catch {}
        } catch {
            // Si la tabla no existe, simplemente enviar al usuario mencionado
            const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
            if (mencionado) {
                try {
                    await sock.sendMessage(mencionado, {
                        text: `📬 *Respuesta de Nexo-Bot Staff:*\n\n${respuesta}`
                    })
                    await sock.sendMessage(jid, { text: `✅ Respuesta enviada.` }, { quoted: mensaje })
                } catch {
                    await sock.sendMessage(jid, { text: `❌ No se pudo enviar la respuesta.` }, { quoted: mensaje })
                }
            } else {
                await sock.sendMessage(jid, { text: `❌ Tabla de sugerencias no encontrada. Menciona al usuario con @.` }, { quoted: mensaje })
            }
        }
    }
}

export default reply
