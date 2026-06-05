import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const preguntas = [
    { p: '¿Cuál es el planeta más grande del sistema solar?', r: 'jupiter', pistas: ['Es un gigante gaseoso', 'Tiene la Gran Mancha Roja'] },
    { p: '¿Cuántos lados tiene un hexágono?', r: '6', pistas: ['Más que un cuadrado', 'Menos que un octágono'] },
    { p: '¿En qué continente está Brasil?', r: 'america', pistas: ['Hablan portugués', 'Tiene el Amazonas'] },
    { p: '¿Cuántos colores tiene el arcoíris?', r: '7', pistas: ['Uno es el rojo', 'Termina en violeta'] },
    { p: '¿Cuál es el metal más ligero?', r: 'litio', pistas: ['Es un metal alcalino', 'Se usa en baterías'] },
    { p: '¿Cuál es el océano más grande?', r: 'pacifico', pistas: ['Está entre Asia y América', 'Su nombre significa tranquilo'] },
    { p: '¿Cuántos huesos tiene el cuerpo humano adulto?', r: '206', pistas: ['Más de 200', 'Menos de 210'] },
    { p: '¿Cuál es el animal más rápido del mundo?', r: 'guepardo', pistas: ['Es un felino', 'Vive en África'] },
    { p: '¿Cuántos segundos tiene un minuto?', r: '60', pistas: ['También son los minutos de una hora', 'Doble de 30'] },
    { p: '¿Qué gas respiramos principalmente?', r: 'nitrogeno', pistas: ['No es el oxígeno', 'Es el 78% del aire'] },
    { p: '¿Cuál es la capital de Japón?', r: 'tokio', pistas: ['Empieza con T', 'Ciudad más poblada del mundo'] },
    { p: '¿Cuántos continentes hay?', r: '7', pistas: ['Más de 6', 'Incluye la Antártida'] },
    { p: '¿Cuál es el río más largo del mundo?', r: 'nilo', pistas: ['Está en África', 'Tiene solo 4 letras'] },
    { p: '¿A qué temperatura hierve el agua?', r: '100', pistas: ['En grados Celsius', 'Triple cifra'] },
    { p: '¿Cuántos planetas tiene el sistema solar?', r: '8', pistas: ['Plutón ya no cuenta', 'Menos de 10'] },
    { p: '¿Cuál es la montaña más alta del mundo?', r: 'everest', pistas: ['Está en Asia', 'Empieza con E'] },
    { p: '¿Cuántas horas tiene un día?', r: '24', pistas: ['El doble de 12', 'Múltiplo de 8'] },
    { p: '¿Cuál es el idioma más hablado del mundo?', r: 'mandarin', pistas: ['Es asiático', 'De China'] },
    { p: '¿Cuántos metros tiene un kilómetro?', r: '1000', pistas: ['Cuatro cifras', 'El doble de 500'] },
    { p: '¿Cuál es el elemento químico del oro?', r: 'au', pistas: ['Son dos letras', 'Del latín Aurum'] },
]

const sesionesActivas = new Map()

const trivia = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'trivia', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        if (sesionesActivas.has(userJid)) {
            await sock.sendMessage(jid, { text: `⚠️ Ya tienes una partida activa.` }, { quoted: mensaje })
            return
        }

        const pregunta = preguntas[Math.floor(Math.random() * preguntas.length)]
        sesionesActivas.set(userJid, true)
        await registrarCooldown(userJid, 'trivia', 3)

        await sock.sendMessage(jid, {
            text: `🧠 *TRIVIA*\n\n❓ ${pregunta.p}\n\n💡 *Pista:* ${pregunta.pistas[0]}\n\nResponde en el chat. Tienes *30 segundos*.`
        }, { quoted: mensaje })

        let respondio = false

        const timeout = setTimeout(async () => {
            if (!respondio) {
                respondio = true
                sesionesActivas.delete(userJid)
                await sock.sendMessage(jid, { text: `⏰ *¡Tiempo agotado!*\n\nLa respuesta era: *${pregunta.r}*` }, { quoted: mensaje })
            }
        }, 30000)

        const listener = async ({ messages }) => {
            if (respondio) return
            for (const m of messages) {
                if (respondio) break
                const autor = m.key.participant || m.key.remoteJid
                if (autor !== userJid || m.key.remoteJid !== jid) continue
                const texto = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').toLowerCase().trim()
                if (!texto) continue

                if (texto === pregunta.r) {
                    respondio = true
                    clearTimeout(timeout)
                    sesionesActivas.delete(userJid)
                    sock.ev.off('messages.upsert', listener)
                    const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
                    await darRecompensaJuego(userJid, 5, 15)
                    await intentarDarEstrella(userJid, sock, jid, mensaje)
                    await sock.sendMessage(jid, {
                        text: `✅ *¡CORRECTO!*\n\n🎯 Respuesta: *${pregunta.r}*\n✨ *+5 XP* | 💰 *+15 monedas*\n🏆 *Victorias totales:* ${victorias}`
                    }, { quoted: m })
                }
            }
        }

        sock.ev.on('messages.upsert', listener)
    }
}

export default trivia