import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

const paises = [
    { bandera: '🇦🇷', nombre: 'argentina' },
    { bandera: '🇨🇴', nombre: 'colombia' },
    { bandera: '🇲🇽', nombre: 'mexico' },
    { bandera: '🇧🇷', nombre: 'brasil' },
    { bandera: '🇨🇱', nombre: 'chile' },
    { bandera: '🇵🇪', nombre: 'peru' },
    { bandera: '🇺🇾', nombre: 'uruguay' },
    { bandera: '🇵🇾', nombre: 'paraguay' },
    { bandera: '🇻🇪', nombre: 'venezuela' },
    { bandera: '🇪🇨', nombre: 'ecuador' },
    { bandera: '🇧🇴', nombre: 'bolivia' },
    { bandera: '🇺🇸', nombre: 'estados unidos' },
    { bandera: '🇨🇦', nombre: 'canada' },
    { bandera: '🇪🇸', nombre: 'españa' },
    { bandera: '🇫🇷', nombre: 'francia' },
    { bandera: '🇩🇪', nombre: 'alemania' },
    { bandera: '🇮🇹', nombre: 'italia' },
    { bandera: '🇵🇹', nombre: 'portugal' },
    { bandera: '🇯🇵', nombre: 'japon' },
    { bandera: '🇨🇳', nombre: 'china' },
    { bandera: '🇰🇷', nombre: 'corea del sur' },
    { bandera: '🇷🇺', nombre: 'rusia' },
    { bandera: '🇮🇳', nombre: 'india' },
    { bandera: '🇦🇺', nombre: 'australia' },
    { bandera: '🇬🇧', nombre: 'reino unido' },
    { bandera: '🇸🇪', nombre: 'suecia' },
    { bandera: '🇳🇴', nombre: 'noruega' },
    { bandera: '🇫🇮', nombre: 'finlandia' },
    { bandera: '🇩🇰', nombre: 'dinamarca' },
    { bandera: '🇳🇱', nombre: 'paises bajos' },
    { bandera: '🇨🇭', nombre: 'suiza' },
    { bandera: '🇹🇷', nombre: 'turquia' },
    { bandera: '🇪🇬', nombre: 'egipto' },
    { bandera: '🇿🇦', nombre: 'sudafrica' },
    { bandera: '🇸🇦', nombre: 'arabia saudita' },
    { bandera: '🇦🇪', nombre: 'emiratos arabes unidos' },
    { bandera: '🇮🇩', nombre: 'indonesia' },
    { bandera: '🇹🇭', nombre: 'tailandia' },
    { bandera: '🇻🇳', nombre: 'vietnam' },
    { bandera: '🇵🇭', nombre: 'filipinas' },
    { bandera: '🇳🇿', nombre: 'nueva zelanda' },
    { bandera: '🇵🇱', nombre: 'polonia' },
    { bandera: '🇺🇦', nombre: 'ucrania' },
    { bandera: '🇬🇷', nombre: 'grecia' },
]

const sesionesActivas = new Map()

const bandera = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'bandera', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar otra vez.` }, { quoted: mensaje })
            return
        }

        if (sesionesActivas.has(userJid)) {
            await sock.sendMessage(jid, { text: `⚠️ Ya tienes una partida activa.` }, { quoted: mensaje })
            return
        }

        const pais = paises[Math.floor(Math.random() * paises.length)]
        let intentos = 0
        const maxIntentos = 3

        sesionesActivas.set(userJid, true)
        await registrarCooldown(userJid, 'bandera', 3)

        await sock.sendMessage(jid, {
            text: `🏳️ *ADIVINA LA BANDERA*\n\n${pais.bandera}\n\nTienes *${maxIntentos} intentos*.\n\nEscribe el nombre del país.`
        }, { quoted: mensaje })

        let terminado = false

        const listener = async ({ messages }) => {
            if (terminado) return
            for (const m of messages) {
                if (terminado) break
                const autor = m.key.participant || m.key.remoteJid
                if (autor !== userJid || m.key.remoteJid !== jid) continue
                const texto = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').toLowerCase().trim()
                if (!texto) continue

                intentos++

                if (texto === pais.nombre) {
                    terminado = true
                    sesionesActivas.delete(userJid)
                    sock.ev.off('messages.upsert', listener)
                    const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
                    await darRecompensaJuego(userJid, 8, 30)
                    await intentarDarEstrella(userJid, sock, jid, mensaje)
                    await sock.sendMessage(jid, {
                        text: `✅ *¡CORRECTO!*\n\n🌍 País: *${pais.nombre}*\n✨ *+8 XP* | 💰 *+30 monedas*\n🏆 *Victorias totales:* ${victorias}`
                    }, { quoted: m })
                } else if (intentos >= maxIntentos) {
                    terminado = true
                    sesionesActivas.delete(userJid)
                    sock.ev.off('messages.upsert', listener)
                    await sock.sendMessage(jid, {
                        text: `❌ *Sin intentos*\n\n🌍 La respuesta era:\n\n${pais.bandera} *${pais.nombre}*`
                    }, { quoted: m })
                } else {
                    await sock.sendMessage(jid, {
                        text: `❌ Incorrecto.\n\nIntentos restantes: *${maxIntentos - intentos}*`
                    }, { quoted: m })
                }
            }
        }

        sock.ev.on('messages.upsert', listener)
    }
}

export default bandera