import db from './db.js'

const OWNERS_JID = '120363425755647814@g.us'

const solicitudes = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        // Solo funciona en el grupo owners
        if (jid !== OWNERS_JID) return

        const [rows] = await db.execute(
            'SELECT * FROM solicitudes WHERE estado = "pendiente" ORDER BY fecha DESC'
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, {
                text: `📋 *Solicitudes pendientes*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ No hay solicitudes pendientes.`
            }, { quoted: mensaje })
            return
        }

        let texto = `📋 *Solicitudes pendientes* (${rows.length})\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

        for (const row of rows) {
            const num = String(row.id).padStart(3, '0')
            texto += `📌 *#${num}*\n`
            texto += `👤 ${row.nombre}\n`
            texto += `🔗 ${row.link}\n`
            texto += `📅 ${new Date(row.fecha).toLocaleString('es-CO')}\n\n`
        }

        texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
        texto += `✦ *.aceptar <número>* → aceptar\n`
        texto += `✦ *.rechazar <número>* → rechazar`

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default solicitudes