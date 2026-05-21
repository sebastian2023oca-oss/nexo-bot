import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import {
    intentarDarEstrella,
    registrarVictoria,
    darRecompensaJuego
} from './juegosUtils.js'

function generarOperacion() {

    const ops = ['+', '-', '*']

    const op =
        ops[
            Math.floor(
                Math.random() *
                ops.length
            )
        ]

    let a
    let b
    let resultado

    if (op === '+') {

        a =
            Math.floor(
                Math.random() * 200
            ) + 1

        b =
            Math.floor(
                Math.random() * 200
            ) + 1

        resultado = a + b

    } else if (op === '-') {

        a =
            Math.floor(
                Math.random() * 200
            ) + 50

        b =
            Math.floor(
                Math.random() *
                (a - 1)
            ) + 1

        resultado = a - b

    } else {

        a =
            Math.floor(
                Math.random() * 20
            ) + 2

        b =
            Math.floor(
                Math.random() * 20
            ) + 2

        resultado = a * b
    }

    return {
        pregunta: `${a} ${op} ${b}`,
        resultado: String(resultado)
    }
}

const mathgame = {
    async ejecutar(sock, mensaje) {

        const jid =
            mensaje.key.remoteJid

        const userJid =
            mensaje.key.participant ||
            mensaje.key.remoteJid

        const enCooldown =
            await verificarCooldown(
                userJid,
                'mathgame',
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

        const {
            pregunta,
            resultado
        } = generarOperacion()

        await registrarCooldown(
            userJid,
            'mathgame',
            3
        )

        await sock.sendMessage(
            jid,
            {
                text:
`🧮 *RETO MATEMÁTICO*

¿Cuánto es:

*${pregunta}* ?

Responde en el chat.

Tienes *20 segundos*.`
            },
            { quoted: mensaje }
        )

        const timeout =
            setTimeout(async()=>{

                delete global.juegosActivos[
                    `${jid}-${userJid}`
                ]

                await sock.sendMessage(
                    jid,
                    {
                        text:
`⏰ *Tiempo agotado*

🎯 Resultado:

*${resultado}*`
                    }
                )

            },20000)

        global.juegosActivos =
            global.juegosActivos || {}

        global.juegosActivos[
            `${jid}-${userJid}`
        ] = {

            respuesta:
                resultado
                .trim(),

            timeout,

            recompensa: async()=>{

                const victorias =
                    await registrarVictoria(
                        userJid,
                        sock,
                        jid,
                        mensaje
                    )

                await darRecompensaJuego(
                    userJid,
                    5,
                    15
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
`🎯 ${pregunta} = ${resultado}

✨ +5 XP
💰 +15 monedas
🏆 Victorias: ${victorias}`
                    }
                )
            }
        }

    }
}

export default mathgame