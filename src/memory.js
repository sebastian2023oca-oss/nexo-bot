import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import {
    intentarDarEstrella,
    registrarVictoria,
    darRecompensaJuego
} from './juegosUtils.js'

const emojisPool = [
    '🍎','🍌','🍇','🍓',
    '🍕','🎮','⚽','🎵',
    '🌟','💎','🔥','🌊'
]

const memory = {

    async ejecutar(sock,mensaje){

        const jid =
            mensaje.key.remoteJid

        const userJid =
            mensaje.key.participant ||
            mensaje.key.remoteJid

        const enCooldown =
            await verificarCooldown(
                userJid,
                'memory',
                3
            )

        if(enCooldown){

            await sock.sendMessage(
                jid,
                {
                    text:
`⏳ Espera *${enCooldown} minutos* para volver a jugar.`
                },
                {
                    quoted:
                    mensaje
                }
            )

            return
        }

        const shuffled =
            [...emojisPool]
            .sort(
                ()=>Math.random()-0.5
            )

        const secuencia =
            shuffled.slice(
                0,
                4
            )

        const respuestaEsperada =
            secuencia.join(' ')

        await registrarCooldown(
            userJid,
            'memory',
            3
        )

        await sock.sendMessage(
            jid,
            {
                text:
`🧠 *JUEGO DE MEMORIA*

Memoriza:

${respuestaEsperada}

⏳ Tienes *5 segundos*`
            },
            {
                quoted:
                mensaje
            }
        )

        await new Promise(
            r=>setTimeout(
                r,
                5000
            )
        )

        await sock.sendMessage(
            jid,
            {
                text:
`❓ *¿Cuál era la secuencia?*

Escribe los emojis
separados por espacios.

Ejemplo:
🍎 🎮 🌟 💎

Tienes *20 segundos*.`
            }
        )

        const timeout =
        setTimeout(
        async()=>{

            delete global
            .juegosActivos[
                `${jid}-${userJid}`
            ]

            await sock.sendMessage(
                jid,
                {
                    text:
`⏰ *Tiempo agotado*

🎯 Secuencia:

${respuestaEsperada}`
                }
            )

        },20000)

        global.juegosActivos =
            global.juegosActivos || {}

        global.juegosActivos[
            `${jid}-${userJid}`
        ] = {

            timeout,

            respuestaEspecial:
            async(texto)=>{

                texto =
                    texto.trim()

                delete global
                .juegosActivos[
                    `${jid}-${userJid}`
                ]

                clearTimeout(
                    timeout
                )

                if(
                    texto ===
                    respuestaEsperada
                ){

                    const victorias =
                    await registrarVictoria(
                        userJid,
                        sock,
                        jid,
                        mensaje
                    )

                    await darRecompensaJuego(
                        userJid,
                        7,
                        22
                    )

                    await intentarDarEstrella(
                        userJid,
                        sock,
                        jid,
                        mensaje
                    )

                    await sock.sendMessage(
                        jid,
                        {
                            text:
`✅ *CORRECTO*

🎯 Secuencia:
${respuestaEsperada}

✨ +7 XP
💰 +22 monedas
🏆 Victorias: ${victorias}`
                        }
                    )

                } else {

                    await sock.sendMessage(
                        jid,
                        {
                            text:
`❌ *Incorrecto*

🎯 Secuencia:

${respuestaEsperada}`
                        }
                    )
                }

                return true
            }
        }
    }
}

export default memory
