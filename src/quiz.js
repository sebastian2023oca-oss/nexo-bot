import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import {
    intentarDarEstrella,
    registrarVictoria,
    darRecompensaJuego
} from './juegosUtils.js'

const preguntas = [
    { p: '¿Cuál es el país más grande del mundo?', ops: ['A) China', 'B) Rusia', 'C) Brasil', 'D) Estados Unidos'], r: 'b' },
    { p: '¿Cuántos días tiene un año bisiesto?', ops: ['A) 364', 'B) 365', 'C) 366', 'D) 367'], r: 'c' },
    { p: '¿Cuál es el planeta más cercano al sol?', ops: ['A) Venus', 'B) Tierra', 'C) Marte', 'D) Mercurio'], r: 'd' },
    { p: '¿Qué instrumento tiene 88 teclas?', ops: ['A) Guitarra', 'B) Piano', 'C) Violín', 'D) Flauta'], r: 'b' },
    { p: '¿En qué año llegó el hombre a la Luna?', ops: ['A) 1965', 'B) 1967', 'C) 1969', 'D) 1971'], r: 'c' },
    { p: '¿Cuál es el animal más grande del planeta?', ops: ['A) Elefante', 'B) Tiburón ballena', 'C) Ballena azul', 'D) Jirafa'], r: 'c' },
    { p: '¿Cuántos lados tiene un triángulo?', ops: ['A) 2', 'B) 3', 'C) 4', 'D) 5'], r: 'b' },
    { p: '¿Cuál es el elemento más abundante en la Tierra?', ops: ['A) Hierro', 'B) Oxígeno', 'C) Silicio', 'D) Nitrógeno'], r: 'a' }
]

const quiz = {
    async ejecutar(sock, mensaje) {

        const jid = mensaje.key.remoteJid

        const userJid =
            mensaje.key.participant ||
            mensaje.key.remoteJid

        const enCooldown =
            await verificarCooldown(
                userJid,
                'quiz',
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

        const q =
            preguntas[
                Math.floor(
                    Math.random() *
                    preguntas.length
                )
            ]

        await registrarCooldown(
            userJid,
            'quiz',
            3
        )

        await sock.sendMessage(
            jid,
            {
                text:
`📝 *QUIZ*

${q.p}

${q.ops.join('\n')}

Responde con:
A, B, C o D

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

🎯 Respuesta:
*${q.r.toUpperCase()}*`
                    }
                )

            },20000)

        global.juegosActivos =
            global.juegosActivos || {}

        global.juegosActivos[
            `${jid}-${userJid}`
        ] = {

            respuesta:
                q.r
                .toLowerCase()
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
`✨ +5 XP
💰 +15 monedas
🏆 Victorias: ${victorias}`
                    }
                )
            }
        }

    }
}

export default quiz