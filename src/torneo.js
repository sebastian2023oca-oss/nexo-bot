import db from './db.js'

const DURACION_INSCRIPCION_MIN = 5
const MIN_JUGADORES = 3

const torneo = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [activo] = await db.execute(
            'SELECT * FROM casino_torneos WHERE grupo_jid = ? AND estado != "finalizado" ORDER BY id DESC LIMIT 1',
            [jid]
        )

        if (activo.length > 0) {
            const t = activo[0]
            const [yaInscrito] = await db.execute(
                'SELECT id FROM casino_torneos_jugadores WHERE torneo_id = ? AND jid = ?',
                [t.id, userJid]
            )
            if (yaInscrito.length > 0) {
                await sock.sendMessage(jid, { text: `⚠️ Ya estás inscrito en el torneo activo.` }, { quoted: mensaje })
                return
            }

            const [usuario] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
            if (usuario.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
            if ((usuario[0].monedas || 0) < t.cantidad) {
                await sock.sendMessage(jid, { text: `❌ Necesitas *${t.cantidad} monedas* para inscribirte.` }, { quoted: mensaje })
                return
            }

            await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [t.cantidad, userJid])
            await db.execute('INSERT INTO casino_torneos_jugadores (torneo_id, jid) VALUES (?, ?)', [t.id, userJid])

            await sock.sendMessage(jid, {
                text: `🏆 *@${userJid.split('@')[0]} se inscribió al torneo!*\n\n💰 *Cuota:* ${t.cantidad} monedas`,
                mentions: [userJid]
            }, { quoted: mensaje })
            return
        }

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.torneo <cuota de inscripción>*` }, { quoted: mensaje })
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
            'INSERT INTO casino_torneos (grupo_jid, cantidad, cierra_en) VALUES (?, ?, ?)',
            [jid, cuota, cierra]
        )
        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cuota, userJid])
        await db.execute('INSERT INTO casino_torneos_jugadores (torneo_id, jid) VALUES (?, ?)', [result.insertId, userJid])

        await sock.sendMessage(jid, {
            text: `🏆 *¡TORNEO CREADO!*\n\n👤 Creado por @${userJid.split('@')[0]}\n💰 *Cuota de inscripción:* ${cuota.toLocaleString()} monedas\n⏳ *Inscripciones abiertas por:* ${DURACION_INSCRIPCION_MIN} minutos\n👥 *Mínimo de jugadores:* ${MIN_JUGADORES}\n\n💡 Usa *.torneo* para inscribirte.`,
            mentions: [userJid]
        }, { quoted: mensaje })

        setTimeout(async () => {
            try {
                const [jugadores] = await db.execute(
                    'SELECT jid FROM casino_torneos_jugadores WHERE torneo_id = ?',
                    [result.insertId]
                )

                if (jugadores.length < MIN_JUGADORES) {
                    // Reembolsar a todos
                    for (const j of jugadores) {
                        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cuota, j.jid])
                    }
                    await db.execute('UPDATE casino_torneos SET estado = "finalizado" WHERE id = ?', [result.insertId])
                    await sock.sendMessage(jid, {
                        text: `🏆 *Torneo cancelado.* No se alcanzó el mínimo de ${MIN_JUGADORES} jugadores.\n\n💰 Se reembolsaron las cuotas a todos.`
                    })
                    return
                }

                await db.execute('UPDATE casino_torneos SET estado = "en_curso" WHERE id = ?', [result.insertId])

                // Eliminación aleatoria sucesiva hasta dejar un ganador
                let restantes = jugadores.map(j => j.jid)
                let rondaTexto = `🏆 *¡TORNEO INICIADO!* (${restantes.length} jugadores)\n\n`

                while (restantes.length > 1) {
                    const eliminadoIdx = Math.floor(Math.random() * restantes.length)
                    const eliminado = restantes[eliminadoIdx]
                    restantes = restantes.filter((_, i) => i !== eliminadoIdx)
                    rondaTexto += `💀 @${eliminado.split('@')[0]} eliminado\n`
                }

                const ganador = restantes[0]
                const premioTotal = jugadores.length * cuota
                await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [premioTotal, ganador])
                await db.execute('UPDATE casino_torneos SET estado = "finalizado" WHERE id = ?', [result.insertId])

                rondaTexto += `\n🎉 *¡GANADOR:* @${ganador.split('@')[0]}!\n💰 *Premio total:* ${premioTotal.toLocaleString()} monedas`

                await sock.sendMessage(jid, { text: rondaTexto, mentions: [...jugadores.map(j => j.jid)] })
            } catch {}
        }, DURACION_INSCRIPCION_MIN * 60000)
    }
}

export default torneo
