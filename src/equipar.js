import db from './db.js'

const MAX_EQUIPADOS = 5

const equipar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.equipar <item>*` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase()

        const [rows] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = ?',
            [userJid, itemKey]
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No tienes *${itemKey}* en tu inventario.` }, { quoted: mensaje })
            return
        }

        if (rows[0].equipado) {
            await sock.sendMessage(jid, { text: `⚠️ *${itemKey}* ya está equipado.` }, { quoted: mensaje })
            return
        }

        // Verificar cooldown de capa_sigilo
        if (itemKey === 'capa_sigilo') {
            const [cd] = await db.execute(
                'SELECT expira FROM cooldowns WHERE jid = ? AND tipo = "equipar_capa_sigilo" AND expira > NOW()',
                [userJid]
            )
            if (cd.length > 0) {
                const diff = new Date(cd[0].expira) - Date.now()
                const mins = Math.ceil(diff / 60000)
                await sock.sendMessage(jid, {
                    text: `⏳ Debes esperar *${mins} minutos* para volver a equipar la *Capa de Sigilo*.`
                }, { quoted: mensaje })
                return
            }
        }

        // Verificar límite de 5 equipados
        const [equipados] = await db.execute(
            'SELECT COUNT(*) as total FROM inventario_usuario WHERE jid = ? AND equipado = 1',
            [userJid]
        )
        if ((equipados[0].total || 0) >= MAX_EQUIPADOS) {
            await sock.sendMessage(jid, {
                text: `❌ Ya tienes *${MAX_EQUIPADOS} ítems equipados* (máximo permitido).\n\n💡 Usa *.desequipar <item>* para liberar un espacio.`
            }, { quoted: mensaje })
            return
        }

        await db.execute('UPDATE inventario_usuario SET equipado = 1 WHERE jid = ? AND item = ?', [userJid, itemKey])

        // Registrar duración de 12h en items_activos para capa_sigilo
        if (itemKey === 'capa_sigilo') {
            const expira = new Date(Date.now() + 12 * 3600000)
            await db.execute(
                'INSERT INTO items_activos (jid, item, expira) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expira = ?',
                [userJid, 'capa_sigilo', expira, expira]
            )
        }

        await sock.sendMessage(jid, {
            text: `⚡ *ÍTEM EQUIPADO*\n\n✅ Equipaste *${itemKey}* correctamente.\n\nSus beneficios están activos.${itemKey === 'capa_sigilo' ? '\n\n🧥 La capa durará *12 horas* activa.\n⚠️ Si envías una imagen, sticker o video se desequipará.' : ''}\n\n📊 *Equipados:* ${(equipados[0].total || 0) + 1}/${MAX_EQUIPADOS}`
        }, { quoted: mensaje })
    }
}

export default equipar