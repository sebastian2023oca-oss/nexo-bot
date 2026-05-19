import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const palabras = [
    { palabra: 'elefante', pista: 'Animal grande con trompa' },
    { palabra: 'guitarra', pista: 'Instrumento musical de cuerdas' },
    { palabra: 'mariposa', pista: 'Insecto con alas de colores' },
    { palabra: 'cascada', pista: 'Caída de agua natural' },
    { palabra: 'planeta', pista: 'Cuerpo celeste que orbita una estrella' },
    { palabra: 'volcano', pista: 'Montaña que expulsa lava' },
    { palabra: 'dinosaurio', pista: 'Animal prehistórico extinto' },
    { palabra: 'chocolate', pista: 'Dulce hecho de cacao' },
    { palabra: 'submarino', pista: 'Vehículo que navega bajo el agua' },
    { palabra: 'piramide', pista: 'Construcción egipcia antigua' },
]

function ocultarPalabra(palabra) {
    return palabra.split('').map((l, i) => i === 0 || i === palabra.length - 1 ? l : '_').join(' ')
}

const adivina = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'adivina', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        const w = palabras[Math.floor(Math.random() * palabras.length)]
        const oculta = ocultarPalabra(w.palabra)

        await sock.sendMessage(jid, {
            text: `🔡 *ADIVINA LA PALABRA*\n\n💡 Pista: *${w.pista}*\n\n🔤 Palabra: *${oculta}*\n(${w.palabra.length} letras)\n\nTienes *30 segundos*.`
        }, { quoted: mensaje })

        await registrarCooldown(userJid, 'adivina', 3)

        const escuchar = sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const m of messages) {
                const autor = m.key.participant || m.key.remoteJid
                const texto = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').toLowerCase().trim()

                if (autor !== userJid || m.key.remoteJid !== jid) continue
                if (texto !== w.palabra) continue

                escuchar()
                clearTimeout(timeout)
                const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
                await darRecompensaJuego(userJid, 5, 15)
                await intentarDarEstrella(userJid, sock, jid, mensaje)
                await sock.sendMessage(jid, {
                    text: `✅ *¡CORRECTO!*\n\n🎯 La palabra era: *${w.palabra}*\n✨ *+5 XP* | 💰 *+15 monedas*\n🏆 *Victorias totales:* ${victorias}`
                }, { quoted: m })
            }
        })

        const timeout = setTimeout(async () => {
            escuchar()
            await sock.sendMessage(jid, {
                text: `⏰ *¡Tiempo agotado!*\n\nLa palabra era: *${w.palabra}*`
            }, { quoted: mensaje })
        }, 30000)
    }
}

export default adivina
