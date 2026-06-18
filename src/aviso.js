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
        const textoAviso = `📢 *AVISO OFICIAL DE NEXO BOT*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${mensajeAviso}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n👑 *Nexo Bot Staff*`

        // Obtener todos los grupos registrados
        const [grupos] = await db.execute('SELECT jid FROM grupos_activos')

        if (grupos.length === 0) {
            await sock.sendMessage(jid, {
                text: `⚠️ No hay grupos registrados aún.\n\nLos grupos se registran automáticamente cuando alguien usa un comando del bot.`
            }, { quoted: mensaje })
            return
        }

        await sock.sendMessage(jid, {
            text: `📢 *Enviando aviso global a ${grupos.length} grupos...*`
        }, { quoted: mensaje })

        let enviados = 0
        let fallidos = 0

        for (const grupo of grupos) {
            try {
                await sock.sendMessage(grupo.jid, { text: textoAviso })
                enviados++
                // Pequeña pausa para no saturar
                await new Promise(r => setTimeout(r, 300))
            } catch {
                fallidos++
            }
        }

        await sock.sendMessage(jid, {
            text: `✅ *Aviso enviado*\n\n📊 *Grupos alcanzados:* ${enviados}\n❌ *Fallidos:* ${fallidos}`
        }, { quoted: mensaje })
    }
}

export default aviso