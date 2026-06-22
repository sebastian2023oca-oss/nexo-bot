import db from './db.js'

const DURACION_MIN = 5

const subasta = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [activa] = await db.execute(
            'SELECT * FROM casino_subastas WHERE grupo_jid = ? AND activa = 1 AND cierra_en > NOW()',
            [jid]
        )

        // Si hay subasta activa, este comando funciona como "pujar"
        if (activa.length > 0) {
            if (!args[0]) {
                await sock.sendMessage(jid, { text: `❌ Uso correcto: *.subasta <cantidad>* para pujar.` }, { quoted: mensaje })
                return
            }

            const monto = parseInt(args[0])
            if (isNaN(monto) || monto <= 0) {
                await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
                return
            }

            const sub = activa[0]
            if (monto <= sub.monto_mejor) {
                await sock.sendMessage(jid, { text: `❌ Tu puja debe ser mayor a *${sub.monto_mejor.toLocaleString()} monedas*.` }, { quoted: mensaje })
                return
            }

            const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
            if (rows.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
            if ((rows[0].monedas || 0) < monto) {
                await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero para pujar *${monto} monedas*.` }, { quoted: mensaje })
                return
            }

            await db.execute('UPDATE casino_subastas SET jid_mejor = ?, monto_mejor = ? WHERE id = ?', [userJid, monto, sub.id])

            const restanteMs = new Date(sub.cierra_en) - Date.now()
            const restanteMin = Math.max(0, Math.ceil(restanteMs / 60000))

            await sock.sendMessage(jid, {
                text: `🔨 *NUEVA PUJA*\n\n👤 @${userJid.split('@')[0]} pujó *${monto.toLocaleString()} monedas*\n\n⏳ La subasta cierra en *${restanteMin} minutos*.`,
                mentions: [userJid]
            }, { quoted: mensaje })
            return
        }

        // Si no hay subasta activa, este comando la inicia
        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.subasta <cantidad>* para iniciar una subasta con puja mínima.` }, { quoted: mensaje })
            return
        }

        const montoInicial = parseInt(args[0])
        if (isNaN(montoInicial) || montoInicial <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const cierra = new Date(Date.now() + DURACION_MIN * 60000)
        await db.execute(
            'INSERT INTO casino_subastas (grupo_jid, jid_mejor, monto_mejor, cierra_en) VALUES (?, ?, ?, ?)',
            [jid, userJid, montoInicial, cierra]
        )

        await sock.sendMessage(jid, {
            text: `🔨 *SUBASTA INICIADA*\n\n👤 Puja inicial de @${userJid.split('@')[0]}: *${montoInicial.toLocaleString()} monedas*\n⏳ *Duración:* ${DURACION_MIN} minutos\n\n💡 Usa *.subasta <cantidad>* para superar la puja.`,
            mentions: [userJid]
        }, { quoted: mensaje })

        setTimeout(async () => {
            try {
                const [sub] = await db.execute('SELECT * FROM casino_subastas WHERE grupo_jid = ? AND activa = 1 ORDER BY id DESC LIMIT 1', [jid])
                if (sub.length === 0) return
                const ganador = sub[0].jid_mejor
                const monto = sub[0].monto_mejor

                await db.execute('UPDATE casino_subastas SET activa = 0 WHERE id = ?', [sub[0].id])

                const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [ganador])
                if (rows.length > 0 && (rows[0].monedas || 0) >= monto) {
                    await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [monto, ganador])
                    await sock.sendMessage(jid, {
                        text: `🔨 *¡SUBASTA CERRADA!*\n\n🏆 @${ganador.split('@')[0]} ganó con *${monto.toLocaleString()} monedas* pagadas.`,
                        mentions: [ganador]
                    })
                } else {
                    await sock.sendMessage(jid, { text: `🔨 *Subasta cerrada sin fondos suficientes del ganador. Sin efecto.*` })
                }
            } catch {}
        }, DURACION_MIN * 60000)
    }
}

export default subasta
