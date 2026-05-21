import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import {
    intentarDarEstrella,
    registrarVictoria,
    darRecompensaJuego
} from './juegosUtils.js'

const palabras = [
    { palabra: 'elefante', pista: 'Animal grande con trompa' },
    { palabra: 'guitarra', pista: 'Instrumento musical de cuerdas' },
    { palabra: 'mariposa', pista: 'Insecto con alas de colores' },
    { palabra: 'cascada', pista: 'Caída de agua natural' },
    { palabra: 'planeta', pista: 'Cuerpo celeste que orbita una estrella' },
    { palabra: 'volcan', pista: 'Montaña que expulsa lava' },
    { palabra: 'dinosaurio', pista: 'Animal prehistórico extinto' },
    { palabra: 'chocolate', pista: 'Dulce hecho de cacao' },
    { palabra: 'submarino', pista: 'Vehículo que navega bajo el agua' },
    { palabra: 'piramide', pista: 'Construcción egipcia antigua' }
]

function ocultarPalabra(palabra) {
    return palabra
        .split('')
        .map((l, i) =>
            i === 0 || i === palabra.length - 1
                ? l
                : '_'
        )
        .join(' ')
}

const adivina = {
    async ejecutar(sock, mensaje) {

        const jid =
            mensaje.key.remoteJid

        const userJid =
            mensaje.key.participant ||
            mensaje.key.remoteJid

        const enCooldown =
            await verificarCooldown(
                userJid,
                'adivina',
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

        const w =
            palabras[
                Math.floor(
                    Math.random() *
                    palabras.length
                )
            ]

        const oculta =
            ocultarPalabra(
                w.palabra
            )

        await registrarCooldown(
            userJid,
            'adivina',
            3
        )

        await sock.sendMessage(
            jid,
            {
                text:
`🔡 *ADIVINA LA PALABRA*

💡 Pista:
*${w.pista}*

🔤 Palabra:
*${oculta}*

(${w.palabra.length} letras)

Tienes *30 segundos*.`
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

🎯 La palabra era:
*${w.palabra}*`
                    }
                )

            },30000)

        global.juegosActivos =
            global.juegosActivos || {}

        global.juegosActivos[
            `${jid}-${userJid}`
        ] = {

            respuesta:
                w.palabra
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

export default adivina