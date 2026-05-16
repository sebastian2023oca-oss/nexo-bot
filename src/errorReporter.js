import nodemailer from 'nodemailer'

const GRUPO_OWNERS = '120363425755647814@g.us'

// Configura tu cuenta de correo aquí
const pipelineTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Cambia si usas otro proveedor
    port: 465,
    secure: true, // true para puerto 465, false para otros
    auth: {
        user: 'sebastian2023oca@gmail.com', 
        pass: 'uskeqaakowkxwndj' // No es tu contraseña normal, es un token de app
    }
})

export async function reportarErrorComando(sock, { comandoTexto, mensaje, error }) {
    const usuario = mensaje.key.participant || mensaje.key.remoteJid
    const chatOrigen = mensaje.key.remoteJid

    const textoError = `⚠️ *REPORT DE ERROR - NEXO BOT* ⚠️\n\n` +
                       `📌 *Comando:* \`${comandoTexto}\`\n` +
                       `👥 *Chat:* \`${chatOrigen}\`\n` +
                       `👤 *Usuario:* @${usuario.split('@')[0]}\n` +
                       `❌ *Error:* ${error.message || error}\n\n` +
                       `💻 *Stack:* \n\`\`\`${error.stack || 'No disponible'}\`\`\``

    // 1. Envío a WhatsApp (Flujo actual)
    try {
        await sock.sendMessage(GRUPO_OWNERS, { text: textoError, mentions: [usuario] })
    } catch (sendErr) {
        console.error('No se pudo enviar el reporte a WhatsApp:', sendErr)
    }

    // 2. Envío a Correo (Nuevo Respaldo)
    try {
        await pipelineTransporter.sendMail({
            from: '"Nexo Bot Alertas" <sebastian2023oca@gmail.com>',
            to: 'sc2559039@gmail.com', 
            subject: `🚨 ERROR CRÍTICO: ${comandoTexto}`,
            text: textoError.replace(/[*`]/g, ''), // Limpia negritas de WhatsApp para el texto plano
            html: `<h2 style="color: red;">Reporte de Error</h2>
                   <p><b>Comando:</b> ${comandoTexto}</p>
                   <p><b>Chat:</b> ${chatOrigen}</p>
                   <p><b>Usuario:</b> ${usuario}</p>
                   <p><b>Error:</b> ${error.message || error}</p>
                   <pre style="background: #f4f4f4; padding: 10px;">${error.stack || 'No disponible'}</pre>`
        })
    } catch (emailErr) {
        console.error('No se pudo enviar el reporte al correo:', emailErr)
    }
}