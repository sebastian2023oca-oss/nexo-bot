import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import {
    intentarDarEstrella,
    registrarVictoria,
    darRecompensaJuego
} from './juegosUtils.js'

const adivinanumero = {
    async ejecutar(sock, mensaje) {

        const jid =
            mensaje.key.remoteJid

        const userJid =
            mensaje.key.participant ||
            mensaje.key.remoteJid

        const enCooldown =
            await verificarCooldown(
                userJid,
                'adivinanumero',
                3
            )

        if (enCooldown) {

            await sock.sendMessage(
                jid,
                {
                    text:
`⏳ Espera *${enCooldown} minutos* para jugar otra vez.`
                },
                { quoted: mensaje }
            )

            return
        }

        const numero =
            Math.floor(
                Math.random() * 20
            ) + 1

        let intentos = 0

        const maxIntentos = 5

        await registrarCooldown(
            userJid,
            'adivinanumero',
            3
        )

        await sock.sendMessage(
            jid,
            {
                text:
`🔢 *ADIVINA EL NÚMERO*

Pienso en un número
del *1 al 20*

🎯 Intentos:
${maxIntentos}

¡Empieza!`
            },
            { quoted: mensaje }
        )

        global.juegosActivos =
            global.juegosActivos || {}

        global.juegosActivos[
            `${jid}-${userJid}`
        ] = {

            timeout: null,

            respuestaEspecial:
            async(texto)=>{

                const num =
                    parseInt(
                        texto.trim()
                    )

                if(
                    isNaN(num)
                ) return false

                intentos++

                if(
                    num === numero
                ){

                    delete global
                    .juegosActivos[
                    `${jid}-${userJid}`
                    ]

                    const victorias =
                    await registrarVictoria(
                        userJid,
                        sock,
                        jid,
                        mensaje
                    )

                    await darRecompensaJuego(
                        userJid,
                        6,
                        20
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

🎯 Número:
${numero}

📊 Intentos:
${intentos}

✨ +6 XP
💰 +20 monedas
🏆 Victorias: ${victorias}`
                        }
                    )

                    return true
                }

                if(
                    intentos >=
                    maxIntentos
                ){

                    delete global
                    .juegosActivos[
                    `${jid}-${userJid}`
                    ]

                    await sock.sendMessage(
                        jid,
                        {
                            text:
`❌ *Sin intentos*

El número era:

*${numero}*`
                        }
                    )

                    return true
                }

                const pista =
                    num < numero
                    ? '📈 Es mayor'
                    : '📉 Es menor'

                await sock.sendMessage(
                    jid,
                    {
                        text:
`${pista}

Intentos restantes:
${maxIntentos - intentos}`
                    }
                )

                return true
            }
        }

    }
}

export default adivinanumero
