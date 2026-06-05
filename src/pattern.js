import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { intentarDarEstrella, registrarVictoria, darRecompensaJuego } from './juegosUtils.js'

function generarPatron() {
    const tipos = ['numerico', 'suma', 'multiplicacion']
    const tipo = tipos[Math.floor(Math.random() * tipos.length)]

    if (tipo === 'numerico') {
        const inicio = Math.floor(Math.random() * 10) + 1
        const paso = Math.floor(Math.random() * 10) + 2
        const sec = [inicio, inicio+paso, inicio+paso*2, inicio+paso*3]
        return { mostrar: sec.join(', ')+', ?', respuesta: String(inicio+paso*4), explicacion: `La diferencia es ${paso}` }
    } else if (tipo === 'suma') {
        const a = Math.floor(Math.random()*5)+2, b = Math.floor(Math.random()*5)+2
        let prev=a, curr=b, seq=[a,b]
        for(let i=0;i<3;i++){const n=prev+curr;seq.push(n);prev=curr;curr=n}
        return { mostrar: seq.slice(0,4).join(', ')+', ?', respuesta: String(seq[4]), explicacion: 'Cada número es la suma de los dos anteriores' }
    } else {
        const f=Math.floor(Math.random()*3)+2, i=Math.floor(Math.random()*5)+1
        const sec=[i,i*f,i*f**2,i*f**3]
        return { mostrar: sec.join(', ')+', ?', respuesta: String(i*f**4), explicacion: `Cada número se multiplica por ${f}` }
    }
}

const sesionesActivas = new Map()

const pattern = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'pattern', 3)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Espera *${enCooldown} minutos* para jugar de nuevo.` }, { quoted: mensaje })
            return
        }

        if (sesionesActivas.has(userJid)) {
            await sock.sendMessage(jid, { text: `⚠️ Ya tienes una partida activa.` }, { quoted: mensaje })
            return
        }

        const { mostrar, respuesta, explicacion } = generarPatron()
        sesionesActivas.set(userJid, true)
        await registrarCooldown(userJid, 'pattern', 3)

        await sock.sendMessage(jid, {
            text: `🔢 *DETECTA EL PATRÓN*\n\n¿Cuál es el siguiente número?\n\n*${mostrar}*\n\nTienes *25 segundos*.`
        }, { quoted: mensaje })

        let respondio = false

        const timeout = setTimeout(async () => {
            if (!respondio) {
                respondio = true
                sesionesActivas.delete(userJid)
                await sock.sendMessage(jid, { text: `⏰ *¡Tiempo agotado!*\n\nLa respuesta era: *${respuesta}*\n💡 ${explicacion}` }, { quoted: mensaje })
            }
        }, 25000)

        const listener = async ({ messages }) => {
            if (respondio) return
            for (const m of messages) {
                if (respondio) break
                const autor = m.key.participant || m.key.remoteJid
                if (autor !== userJid || m.key.remoteJid !== jid) continue
                const texto = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim()
                if (isNaN(parseInt(texto))) continue

                respondio = true
                clearTimeout(timeout)
                sesionesActivas.delete(userJid)
                sock.ev.off('messages.upsert', listener)

                if (texto === respuesta) {
                    const victorias = await registrarVictoria(userJid, sock, jid, mensaje)
                    await darRecompensaJuego(userJid, 6, 20)
                    await intentarDarEstrella(userJid, sock, jid, mensaje)
                    await sock.sendMessage(jid, {
                        text: `✅ *¡CORRECTO!*\n\n🎯 *${respuesta}*\n💡 ${explicacion}\n✨ *+6 XP* | 💰 *+20 monedas*\n🏆 *Victorias totales:* ${victorias}`
                    }, { quoted: m })
                } else {
                    await sock.sendMessage(jid, {
                        text: `❌ *Incorrecto.*\n\nLa respuesta era: *${respuesta}*\n💡 ${explicacion}`
                    }, { quoted: m })
                }
            }
        }

        sock.ev.on('messages.upsert', listener)
    }
}

export default pattern