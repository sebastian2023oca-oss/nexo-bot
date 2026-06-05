import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const preguntas = [
    { p: '¿Cuál es el país más grande del mundo?', ops: ['A) China', 'B) Rusia', 'C) Brasil', 'D) Estados Unidos'], r: 'b' },
    { p: '¿Cuántos días tiene un año bisiesto?', ops: ['A) 364', 'B) 365', 'C) 366', 'D) 367'], r: 'c' },
    { p: '¿Cuál es el planeta más cercano al sol?', ops: ['A) Venus', 'B) Tierra', 'C) Marte', 'D) Mercurio'], r: 'd' },
    { p: '¿Qué instrumento tiene 88 teclas?', ops: ['A) Guitarra', 'B) Piano', 'C) Violín', 'D) Flauta'], r: 'b' },
    { p: '¿En qué año llegó el hombre a la Luna?', ops: ['A) 1965', 'B) 1967', 'C) 1969', 'D) 1971'], r: 'c' },
    { p: '¿Cuál es el animal más grande del planeta?', ops: ['A) Elefante', 'B) Tiburón ballena', 'C) Ballena azul', 'D) Jirafa'], r: 'c' },
    { p: '¿Cuántos lados tiene un triángulo?', ops: ['A) 2', 'B) 3', 'C) 4', 'D) 5'], r: 'b' },
    { p: '¿Cuál es el elemento más abundante en la corteza terrestre?', ops: ['A) Hierro', 'B) Oxígeno', 'C) Silicio', 'D) Nitrógeno'], r: 'b' },
    { p: '¿En qué país se inventó el fútbol?', ops: ['A) Brasil', 'B) España', 'C) Inglaterra', 'D) Argentina'], r: 'c' },
    { p: '¿Cuántos jugadores tiene un equipo de fútbol?', ops: ['A) 9', 'B) 10', 'C) 11', 'D) 12'], r: 'c' },
    { p: '¿Qué planeta tiene los anillos más famosos?', ops: ['A) Júpiter', 'B) Urano', 'C) Neptuno', 'D) Saturno'], r: 'd' },
    { p: '¿Cuántos huesos tiene la columna vertebral humana?', ops: ['A) 24', 'B) 26', 'C) 33', 'D) 28'], r: 'c' },
]

const sesionesActivas = new Map()

const quiz = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'quiz', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        if (sesionesActivas.has(userJid)) {
            await sock.sendMessage(jid, { text: `⚠️ Ya tienes una partida activa. Espera a que termine.` }, { quoted: mensaje })
            return
        }

        const q = preguntas[Math.floor(Math.random() * preguntas.length)]
        sesionesActivas.set(userJid, true)
        await registrarCooldown(userJid, 'quiz', 3)

        await sock.sendMessage(jid, {
            text: `📝 *QUIZ*\n\n${q.p}\n\n${q.ops.join('\n')}\n\nResponde con A, B, C o D. Tienes *20 segundos*.`
        }, { quoted: mensaje })

        let respondio = false

        const timeout = setTimeout(async () => {
            if (!respondio) {
                respondio = true
                sesionesActivas.delete(userJid)
                await sock.sendMessage(jid, {
                    text: `⏰ *¡Tiempo agotado!*\n\nLa respuesta correcta era: *${q.r.toUpperCase()}*`
                }, { quoted: mensaje })
            }
        }, 20000)

        const listener = async ({ messages }) => {
            if (respondio) return
            for (const m of messages) {
                if (respondio) break
                const autor = m.key.participant || m.key.remoteJid
                if (autor !== userJid || m.key.remoteJid !== jid) continue
                const texto = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').toLowerCase().trim()
                if (!['a', 'b', 'c', 'd'].includes(texto)) continue

                respondio = true
                clearTimeout(timeout)
                sesionesActivas.delete(userJid)
                sock.ev.off('messages.upsert', listener)

                if (texto === q.r) {
                    const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
                    await darRecompensaJuego(userJid, 5, 15)
                    await intentarDarEstrella(userJid, sock, jid, mensaje)
                    await sock.sendMessage(jid, {
                        text: `✅ *¡CORRECTO!*\n\nRespuesta: *${q.r.toUpperCase()}*\n✨ *+5 XP* | 💰 *+15 monedas*\n🏆 *Victorias totales:* ${victorias}`
                    }, { quoted: m })
                } else {
                    await sock.sendMessage(jid, {
                        text: `❌ *Incorrecto.*\n\nLa respuesta correcta era: *${q.r.toUpperCase()}*`
                    }, { quoted: m })
                }
            }
        }

        sock.ev.on('messages.upsert', listener)
    }
}

export default quiz