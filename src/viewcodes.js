import db from './db.js'
import { esOwner } from './owners.js'

const viewcodes = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute(
            'SELECT * FROM codigos_canjeables WHERE activo = 1 ORDER BY creado_en DESC'
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `📋 *No hay códigos activos en este momento.*` }, { quoted: mensaje })
            return
        }

        let texto = `🎟️ *CÓDIGOS ACTIVOS* (${rows.length})\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

        for (const c of rows) {
            texto += `🔑 \`${c.codigo}\`\n`
            texto += `📦 *Nombre:* ${c.nombre}\n`
            texto += `💰 *Valor:* ${c.cantidad > 0 ? '+' : ''}${c.cantidad} monedas\n`
            texto += `🔢 *Usos:* ${c.usos_usados}/${c.usos_max}\n\n`
        }

        texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default viewcodes
