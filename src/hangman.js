import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import {
    intentarDarEstrella,
    registrarVictoria,
    darRecompensaJuego
} from './juegosUtils.js'

const palabras = [
    'computadora',
    'javascript',
    'dinosaurio',
    'helicoptero',
    'universidad',
    'matematicas',
    'electricidad',
    'fotografia',
    'construccion',
    'imaginacion',
    'revolucion',
    'tecnologia'
]

const hangman = {
    async ejecutar(sock, mensaje) {

        const jid = mensaje.key.remoteJid

        const userJid =
            mensaje.key.participant ||
            mensaje.key.remoteJid

        const enCooldown =
            await verificarCooldown(
                userJid,
                'hangman',
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

        const palabra =
            palabras[
                Math.floor(
                    Math.random() *
                    palabras.length
                )
            ]

        const letrasAdivinadas =
            new Set()

        let errores = 0

        const maxErrores = 6

        const figuras = [
            '😐',
            '😟',
            '😰',
            '😱',
            '😨',
            '💀',
            '☠️'
        ]

        const mostrarPalabra = ()=>{

            return palabra
                .split('')
                .map(l=>
                    letrasAdivinadas.has(l)
                    ? l
                    : '_'
                )
                .join(' ')
        }

        await registrarCooldown(
            userJid,
            'hangman',
            3
        )

        await sock.sendMessage(
            jid,
            {
                text:
`🪢 *AHORCADO*

${figuras[0]} Errores: 0/${maxErrores}

🔤 *${mostrarPalabra()}*

Envía una letra.`
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

                texto =
                    texto
                    .toLowerCase()
                    .trim()

                if(texto.length !== 1)
                    return false

                if(
                    letrasAdivinadas.has(
                        texto
                    )
                ) return true

                letrasAdivinadas
                    .add(texto)

                if(
                    !palabra.includes(
                        texto
                    )
                ){
                    errores++
                }

                const actual =
                    mostrarPalabra()

                const gano =
                    !actual.includes('_')

                const perdio =
                    errores >=
                    maxErrores

                if(gano){

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
                        8,
                        25
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
`✅ *¡GANASTE!*

🎯 Palabra:
*${palabra}*

✨ +8 XP
💰 +25 monedas
🏆 Victorias: ${victorias}`
                        }
                    )

                    return true
                }

                if(perdio){

                    delete global
                    .juegosActivos[
                    `${jid}-${userJid}`
                    ]

                    await sock.sendMessage(
                        jid,
                        {
                            text:
`☠️ *PERDISTE*

La palabra era:

*${palabra}*`
                        }
                    )

                    return true
                }

                await sock.sendMessage(
                    jid,
                    {
                        text:
`🪢 *AHORCADO*

${figuras[errores]}
Errores:
${errores}/${maxErrores}

🔤 *${actual}*`
                    }
                )

                return true
            }
        }

    }
}

export default hangman