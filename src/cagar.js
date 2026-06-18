import { esOwner } from './owners.js'

const mensajes = [
    `💩 *¡CAGADA ÉPICA!*\n\n@{usuario} acaba de recibir una cagada monumental de parte de un Owner.\n\n💩💩💩 ¡Qué asco! 💩💩💩`,
    `💩 *¡ATAQUE BIOLÓGICO!*\n\n@{usuario} fue víctima de una emergencia gastrointestinal ajena.\n\nEl daño fue... considerable. 💩`,
    `💩 *¡CAGADA NIVEL DIOS!*\n\n@{usuario} no se lo esperaba... nadie se lo esperaba.\n\nEl grupo nunca volverá a ser el mismo. 💩`,
    `💩 *¡LO PISÓ!*\n\n@{usuario} caminaba tan tranquilo y... PLAF.\n\nEso pasa por no mirar dónde pisas. 💩`,
]

const cagar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        const targetNombre = mencionado
            ? `@${mencionado.split('@')[0]}`
            : `@${userJid.split('@')[0]}`

        const targetJid = mencionado || userJid

        const texto = mensajes[Math.floor(Math.random() * mensajes.length)]
            .replace('{usuario}', targetJid.split('@')[0])

        await sock.sendMessage(jid, {
            text: texto,
            mentions: [targetJid]
        }, { quoted: mensaje })
    }
}

export default cagar
