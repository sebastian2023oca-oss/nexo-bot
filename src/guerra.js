import db from './db.js'

const DURACION_INSCRIPCION_MIN = 5
const MIN_JUGADORES = 3

const guerra = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [activa] = await db.execute(
            'SELECT * FROM casino_guerra WHERE grupo_jid = ? AND estado != "finalizado" ORDER BY id DESC LIMIT 1',
            [jid]
        )

        if (activa.length > 0) {
            const g = activa[0]
            const [yaInscrito] = await db.execute(
                'SELECT id FROM casino_guerra_jugadores WHERE guerra_id = ? AND jid = ?',
                [g.id, userJid]
            )
            if (yaInscrito.length > 0) {
                await sock.sendMessage(jid, { text: `⚠️ Ya estás inscrito en la guerra activa.` }, { quoted: mensaje })
                return
            }

            const [usuario] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
            if (usuario.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
            if ((usuario[0].monedas || 0) < g.cantidad) {
                await sock.sendMessage(jid, { text: `❌ Necesitas *${g.cantidad} monedas* para entrar a la guerra.` }, { quoted: mensaje })
                return
            }

            await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [g.cantidad, userJid])
            await db.execute('INSERT INTO casino_guerra_jugadores (guerra_id, jid) VALUES (?, ?)', [g.id, userJid])

            await sock.sendMessage(jid, {
                text: `⚔️ *@${userJid.split('@')[0]} se unió a la GUERRA!*\n\n💰 *Cuota:* ${g.cantidad} monedas`,
                mentions: [userJid]
            }, { quoted: mensaje })
            return
        }

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.guerra <cuota>*\n\n💡 Battle Royale de apuestas: todos ponen la misma cuota, eliminación aleatoria por rondas hasta que quede un único ganador.` }, { quoted: mensaje })
            return
        }

        const cuota = parseInt(args[0])
        if (isNaN(cuota) || cuota <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cuota debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [usuario] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (usuario.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
        if ((usuario[0].monedas || 0) < cuota) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero para la cuota inicial.` }, { quoted: mensaje })
            return
        }

        const cierra = new Date(Date.now() + DURACION_INSCRIPCION_MIN * 60000)
        const [result] = await db.execute(
            'INSERT INTO casino_guerra (grupo_jid, cantidad, cierra_en) VALUES (?, ?, ?)',
            [jid, cuota, cierra]
        )
        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cuota, userJid])
        await db.execute('INSERT INTO casino_guerra_jugadores (guerra_id, jid) VALUES (?, ?)', [result.insertId, userJid])

        await sock.sendMessage(jid, {
            text: `⚔️ *¡GUERRA DE APUESTAS INICIADA!*\n\n👤 Iniciada por @${userJid.split('@')[0]}\n💰 *Cuota:* ${cuota.toLocaleString()} monedas\n⏳ *Inscripciones por:* ${DURACION_INSCRIPCION_MIN} minutos\n👥 *Mínimo:* ${MIN_JUGADORES} jugadores\n\n💡 Usa *.guerra* para unirte.`,
            mentions: [userJid]
        }, { quoted: mensaje })

        setTimeout(async () => {
            try {
                const [jugadores] = await db.execute(
                    'SELECT jid FROM casino_guerra_jugadores WHERE guerra_id = ?',
                    [result.insertId]
                )

                if (jugadores.length < MIN_JUGADORES) {
                    for (const j of jugadores) {
                        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cuota, j.jid])
                    }
                    await db.execute('UPDATE casino_guerra SET estado = "finalizado" WHERE id = ?', [result.insertId])
                    await sock.sendMessage(jid, { text: `⚔️ *Guerra cancelada.* No se alcanzó el mínimo de ${MIN_JUGADORES} jugadores. Cuotas reembolsadas.` })
                    return
                }

                await db.execute('UPDATE casino_guerra SET estado = "en_curso" WHERE id = ?', [result.insertId])

                let restantes = jugadores.map(j => j.jid)
                let textoGuerra = `⚔️ *¡LA GUERRA COMIENZA!* (${restantes.length} combatientes)\n\n`

                while (restantes.length > 1) {
                    const eliminadoIdx = Math.floor(Math.random() * restantes.length)
                    const eliminado = restantes[eliminadoIdx]
                    restantes = restantes.filter((_, i) => i !== eliminadoIdx)
                    textoGuerra += `💥 @${eliminado.split('@')[0]} cayó en batalla\n`
                }

                const ganador = restantes[0]
                const premioTotal = jugadores.length * cuota
                await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [premioTotal, ganador])
                await db.execute('UPDATE casino_guerra SET estado = "finalizado" WHERE id = ?', [result.insertId])

                textoGuerra += `\n🏆 *¡ÚNICO SOBREVIVIENTE:* @${ganador.split('@')[0]}!\n💰 *Botín de guerra:* ${premioTotal.toLocaleString()} monedas`

                await sock.sendMessage(jid, { text: textoGuerra, mentions: [...jugadores.map(j => j.jid)] })
            } catch {}
        }, DURACION_INSCRIPCION_MIN * 60000)
    }
}

export default guerra