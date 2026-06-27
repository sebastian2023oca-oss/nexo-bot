import db from './db.js'

const DURACION_INSCRIPCION_MIN = 5
const MIN_JUGADORES = 3
const PROB_SOBREVIVIR_RONDA = 0.7

const ultimohombre = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [activa] = await db.execute(
            'SELECT * FROM casino_ultimohombre WHERE grupo_jid = ? AND estado != "finalizado" ORDER BY id DESC LIMIT 1',
            [jid]
        )

        if (activa.length > 0) {
            const p = activa[0]
            const [yaInscrito] = await db.execute(
                'SELECT id FROM casino_ultimohombre_jugadores WHERE partida_id = ? AND jid = ?',
                [p.id, userJid]
            )
            if (yaInscrito.length > 0) {
                await sock.sendMessage(jid, { text: `⚠️ Ya estás inscrito en la partida activa.` }, { quoted: mensaje })
                return
            }

            const [usuario] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
            if (usuario.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
            if ((usuario[0].monedas || 0) < p.cantidad) {
                await sock.sendMessage(jid, { text: `❌ Necesitas *${p.cantidad} monedas* para entrar.` }, { quoted: mensaje })
                return
            }

            await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [p.cantidad, userJid])
            await db.execute('INSERT INTO casino_ultimohombre_jugadores (partida_id, jid) VALUES (?, ?)', [p.id, userJid])

            await sock.sendMessage(jid, {
                text: `🧍 *@${userJid.split('@')[0]} se unió a Último Hombre en Pie!*\n\n💰 *Cuota:* ${p.cantidad} monedas`,
                mentions: [userJid]
            }, { quoted: mensaje })
            return
        }

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.ultimohombre <cuota>*\n\n💡 Eliminación masiva por rondas: en cada ronda algunos sobreviven y otros caen al azar, hasta que quede un único jugador.` }, { quoted: mensaje })
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
            'INSERT INTO casino_ultimohombre (grupo_jid, cantidad, cierra_en) VALUES (?, ?, ?)',
            [jid, cuota, cierra]
        )
        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cuota, userJid])
        await db.execute('INSERT INTO casino_ultimohombre_jugadores (partida_id, jid) VALUES (?, ?)', [result.insertId, userJid])

        await sock.sendMessage(jid, {
            text: `🧍 *¡ÚLTIMO HOMBRE EN PIE INICIADO!*\n\n👤 Iniciado por @${userJid.split('@')[0]}\n💰 *Cuota:* ${cuota.toLocaleString()} monedas\n⏳ *Inscripciones por:* ${DURACION_INSCRIPCION_MIN} minutos\n👥 *Mínimo:* ${MIN_JUGADORES} jugadores\n\n💡 Usa *.ultimohombre* para unirte.`,
            mentions: [userJid]
        }, { quoted: mensaje })

        setTimeout(async () => {
            try {
                const [jugadores] = await db.execute(
                    'SELECT jid FROM casino_ultimohombre_jugadores WHERE partida_id = ?',
                    [result.insertId]
                )

                if (jugadores.length < MIN_JUGADORES) {
                    for (const j of jugadores) {
                        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cuota, j.jid])
                    }
                    await db.execute('UPDATE casino_ultimohombre SET estado = "finalizado" WHERE id = ?', [result.insertId])
                    await sock.sendMessage(jid, { text: `🧍 *Partida cancelada.* No se alcanzó el mínimo de ${MIN_JUGADORES} jugadores. Cuotas reembolsadas.` })
                    return
                }

                await db.execute('UPDATE casino_ultimohombre SET estado = "en_curso" WHERE id = ?', [result.insertId])

                let restantes = jugadores.map(j => j.jid)
                let textoPartida = `🧍 *¡COMIENZA LA PARTIDA!* (${restantes.length} jugadores)\n\n`
                let ronda = 1

                while (restantes.length > 1) {
                    const sobrevivientes = restantes.filter(() => Math.random() < PROB_SOBREVIVIR_RONDA)
                    // Garantizar que siempre quede al menos 1 si todos caen
                    const finales = sobrevivientes.length > 0 ? sobrevivientes : [restantes[Math.floor(Math.random() * restantes.length)]]
                    const eliminados = restantes.filter(j => !finales.includes(j))

                    if (eliminados.length > 0) {
                        textoPartida += `🔸 *Ronda ${ronda}:* ${eliminados.length} eliminado(s)\n`
                    }
                    restantes = finales
                    ronda++

                    if (ronda > 20) break // seguridad anti-loop infinito
                }

                const ganador = restantes[0]
                const premioTotal = jugadores.length * cuota
                await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [premioTotal, ganador])
                await db.execute('UPDATE casino_ultimohombre SET estado = "finalizado" WHERE id = ?', [result.insertId])

                textoPartida += `\n🏆 *¡ÚLTIMO HOMBRE EN PIE:* @${ganador.split('@')[0]}!\n💰 *Premio total:* ${premioTotal.toLocaleString()} monedas`

                await sock.sendMessage(jid, { text: textoPartida, mentions: [...jugadores.map(j => j.jid)] })
            } catch {}
        }, DURACION_INSCRIPCION_MIN * 60000)
    }
}

export default ultimohombre