// src/saludo.js
// Saluda al usuario que envió el comando

export default {
    nombre: 'saludo',
    descripcion: 'Saluda al usuario',
    uso: '.saludo [nombre]',

    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid

        // Si el usuario escribió un nombre lo usa, si no usa "amigo"
        const nombre = args.length > 0 ? args.join(' ') : 'amigo'

        await sock.sendMessage(jid, {
            text: `👋 ¡Hola, ${nombre}! Encantado de saludarte.`
        })
    }
}