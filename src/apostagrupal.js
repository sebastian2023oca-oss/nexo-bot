import db from './db.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const DURACION_MIN = 3

const apostagrupal = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const [activa] = await db.execute(
            'SELECT * FROM casino_apuestas_grupales WHERE grupo_jid = ? AND activa = 1 AND cierra_en > NOW()',
            [jid]
        )

        // Si hay una activa, este comando funciona como "unirse"
        if (activa.length > 0) {
            const apuesta = activa[0]

            const [yaUnido] = await db.execute(
                'SELECT id FROM casino_apuestas_grupales_jugadores WHERE apuesta_id = ? AND jid = ?',
                [apuesta.id, userJid]
            )
            if (yaUnido.length > 0) {
                await sock.sendMessage(jid, { text: `⚠️ Ya estás participando en esta apuesta grupal.` }, { quoted: mensaje })
                return
            }

            const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
            if (rows.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
            if ((rows[0].monedas || 0) < apuesta.cantidad) {
                await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero para unirte (*${apuesta.cantidad} monedas*).` }, { quoted: mensaje })
                return
            }

            await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [apuesta.cantidad, userJid])
            await db.execute('INSERT INTO casino_apuestas_grupales_jugadores (apuesta_id, jid) VALUES (?, ?)', [apuesta.id, userJid])

            await sock.sendMessage(jid, {
                text: `🎲 @${userJid.split('@')[0]} se unió a la apuesta grupal de *${apuesta.cantidad} monedas*.`,
                mentions: [userJid]
            }, { quoted: mensaje })
            return
        }

        // Si no hay activa, este comando la crea
        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.apostagrupal <cantidad>* para iniciar una apuesta grupal.` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
        if ((rows[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero.` }, { quoted: mensaje })
            return
        }

        const cierra = new Date(Date.now() + DURACION_MIN * 60000)
        const [result] = await db.execute(
            'INSERT INTO casino_apuestas_grupales (grupo_jid, cantidad, cierra_en) VALUES (?, ?, ?)',
            [jid, cantidad, cierra]
        )
        const apuestaId = result.insertId

        await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [cantidad, userJid])
        await db.execute('INSERT INTO casino_apuestas_grupales_jugadores (apuesta_id, jid) VALUES (?, ?)', [apuestaId, userJid])

        await sock.sendMessage(jid, {
            text: `🎲 *¡APUESTA GRUPAL INICIADA!*\n\n💰 *Cuota de entrada:* ${cantidad} monedas\n👤 *Iniciada por:* @${userJid.split('@')[0]}\n⏳ *Cierra en:* ${DURACION_MIN} minutos\n\n💡 Usa *.apostagrupal* para unirte (mismo comando, sin cantidad).\n\n🏆 Solo uno ganará TODO el pozo acumulado.`,
            mentions: [userJid]
        }, { quoted: mensaje })

        setTimeout(async () => {
            try {
                const [jugadores] = await db.execute(
                    'SELECT jid FROM casino_apuestas_grupales_jugadores WHERE apuesta_id = ?',
                    [apuestaId]
                )
                await db.execute('UPDATE casino_apuestas_grupales SET activa = 0 WHERE id = ?', [apuestaId])

                if (jugadores.length < 2) {
                    if (jugadores.length === 1) {
                        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [cantidad, jugadores[0].jid])
                    }
                    await sock.sendMessage(jid, { text: `🎲 *Apuesta grupal cancelada.* No hubo suficientes participantes, se devolvió el dinero.` })
                    return
                }

                const pozo = cantidad * jugadores.length
                const ganador = jugadores[Math.floor(Math.random() * jugadores.length)].jid

                await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [pozo, ganador])
                await registrarJugadaCasino(ganador, 'apostagrupal', cantidad, 'gano', pozo - cantidad)

                for (const j of jugadores) {
                    if (j.jid !== ganador) {
                        await registrarJugadaCasino(j.jid, 'apostagrupal', cantidad, 'perdio', -cantidad)
                    }
                }

                await sock.sendMessage(jid, {
                    text: `🎲 *¡APUESTA GRUPAL FINALIZADA!*\n\n👥 *Participantes:* ${jugadores.length}\n💰 *Pozo total:* ${pozo.toLocaleString()} monedas\n\n🏆 *GANADOR:* @${ganador.split('@')[0]}`,
                    mentions: [ganador]
                })
            } catch {}
        }, DURACION_MIN * 60000)
    }
}

export default apostagrupal
