import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import {
    intentarDarEstrella,
    registrarVictoria,
    darRecompensaJuego
} from './juegosUtils.js'

const adivinanzas = [
    { p: 'Tengo ciudades pero no casas, montañas pero no árboles, agua pero no peces. ¿Qué soy?', r: 'mapa' },
    { p: 'Cuanto más me secas, más mojado te quedas. ¿Qué soy?', r: 'toalla' },
    { p: 'Tengo manos pero no puedo aplaudir. ¿Qué soy?', r: 'reloj' },
    { p: 'Soy ligero como una pluma pero ni el hombre más fuerte puede sostenerme por mucho tiempo. ¿Qué soy?', r: 'aliento' },
    { p: 'Cuanto más me quitas, más grande me hago. ¿Qué soy?', r: 'hoyo' },
    { p: 'Tengo boca pero no puedo hablar, tengo hojas pero no soy árbol. ¿Qué soy?', r: 'libro' },
    { p: 'Vivo en invierno, muero en verano y crezco hacia abajo. ¿Qué soy?', r: 'caramelo de hielo' },
    { p: 'Soy tuyo pero tus amigos lo usan más que tú. ¿Qué soy?', r: 'nombre' },
    { p: 'Tengo cabeza y cola pero no tengo cuerpo. ¿Qué soy?', r: 'moneda' },
    { p: 'Mientras más me tienes, menos ves. ¿Qué soy?', r: 'oscuridad' },
    { p: 'Nací en el mar y vivo en tierra. Si me meten al mar me muero. ¿Qué soy?', r: 'sal' },
    { p: 'Tengo ojos pero no veo. ¿Qué soy?', r: 'papa' },
    { p: 'Corro pero no tengo piernas, tengo boca pero no hablo. ¿Qué soy?', r: 'rio' },
    { p: 'Soy grande cuando soy joven y pequeño cuando soy viejo. ¿Qué soy?', r: 'vela' }
]

const riddle = {
    async ejecutar(sock, mensaje) {

        const jid =
            mensaje.key.remoteJid

        const userJid =
            mensaje.key.participant ||
            mensaje.key.remoteJid

        const enCooldown =
            await verificarCooldown(
                userJid,
                'riddle',
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

        const ad =
            adivinanzas[
                Math.floor(
                    Math.random() *
                    adivinanzas.length
                )
            ]

        await registrarCooldown(
            userJid,
            'riddle',
            3
        )

        await sock.sendMessage(
            jid,
            {
                text:
`🧩 *ADIVINANZA*

${ad.p}

Responde en el chat.

Tienes *45 segundos*.`
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

*${ad.r}*`
                    }
                )

            },45000)

        global.juegosActivos =
            global.juegosActivos || {}

        global.juegosActivos[
            `${jid}-${userJid}`
        ] = {

            respuesta:
                ad.r
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

export default riddle
