import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import {
    intentarDarEstrella,
    registrarVictoria,
    darRecompensaJuego
} from './juegosUtils.js'

function generarPatron() {

    const tipos = [
        'numerico',
        'suma',
        'multiplicacion'
    ]

    const tipo =
        tipos[
            Math.floor(
                Math.random() *
                tipos.length
            )
        ]

    if (tipo === 'numerico') {

        const inicio =
            Math.floor(
                Math.random() * 10
            ) + 1

        const paso =
            Math.floor(
                Math.random() * 10
            ) + 2

        const secuencia = [
            inicio,
            inicio + paso,
            inicio + paso * 2,
            inicio + paso * 3
        ]

        return {

            mostrar:
                secuencia.join(', ') +
                ', ?',

            respuesta:
                String(
                    inicio +
                    paso * 4
                ),

            explicacion:
                `La diferencia es ${paso}`
        }

    } else if (
        tipo === 'suma'
    ) {

        const a =
            Math.floor(
                Math.random() * 5
            ) + 2

        const b =
            Math.floor(
                Math.random() * 5
            ) + 2

        let prev = a
        let curr = b

        const seq = [
            prev,
            curr
        ]

        for(
            let i=0;
            i<3;
            i++
        ){

            const next =
                prev + curr

            seq.push(next)

            prev = curr
            curr = next
        }

        return {

            mostrar:
                seq.slice(
                    0,
                    4
                ).join(', ') +
                ', ?',

            respuesta:
                String(seq[4]),

            explicacion:
                'Cada número es la suma de los dos anteriores'
        }

    } else {

        const factor =
            Math.floor(
                Math.random() * 3
            ) + 2

        const inicio =
            Math.floor(
                Math.random() * 5
            ) + 1

        const secuencia = [
            inicio,
            inicio*factor,
            inicio*factor**2,
            inicio*factor**3
        ]

        return {

            mostrar:
                secuencia.join(', ') +
                ', ?',

            respuesta:
                String(
                    inicio*
                    factor**4
                ),

            explicacion:
                `Cada número se multiplica por ${factor}`
        }
    }
}

const pattern = {

    async ejecutar(
        sock,
        mensaje
    ){

        const jid =
            mensaje.key.remoteJid

        const userJid =
            mensaje.key.participant ||
            mensaje.key.remoteJid

        const enCooldown =
            await verificarCooldown(
                userJid,
                'pattern',
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

        const {
            mostrar,
            respuesta,
            explicacion
        } = generarPatron()

        await registrarCooldown(
            userJid,
            'pattern',
            3
        )

        await sock.sendMessage(
            jid,
            {
                text:
`🔢 *DETECTA EL PATRÓN*

¿Cuál es el siguiente número?

*${mostrar}*

Tienes *25 segundos*.`
            },
            {
                quoted:
                mensaje
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

🎯 Respuesta:
*${respuesta}*

💡 ${explicacion}`
                }
            )

        },25000)

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

                if(
                    isNaN(
                        parseInt(
                            texto
                        )
                    )
                ){
                    return false
                }

                delete global
                .juegosActivos[
                    `${jid}-${userJid}`
                ]

                clearTimeout(
                    timeout
                )

                if(
                    texto ===
                    respuesta
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

🎯 Respuesta:
${respuesta}

💡 ${explicacion}

✨ +6 XP
💰 +20 monedas
🏆 Victorias: ${victorias}`
                        }
                    )

                } else {

                    await sock.sendMessage(
                        jid,
                        {
                            text:
`❌ *Incorrecto*

🎯 Respuesta:
${respuesta}

💡 ${explicacion}`
                        }
                    )
                }

                return true
            }
        }
    }
}

export default pattern
