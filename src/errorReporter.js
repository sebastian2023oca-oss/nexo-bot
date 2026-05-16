const GRUPO_OWNERS = '120363425755647814@g.us'

export async function reportarErrorComando(sock, { comandoTexto, mensaje, error }) {
    try {
        const usuario = mensaje.key.participant || mensaje.key.remoteJid
        const chatOrigen = mensaje.key.remoteJid

        const textoError = `⚠️ *REPORT DE ERROR - NEXO BOT* ⚠️\n\n` +
                           `📌 *Comando:* \`${comandoTexto}\`\n` +
                           `👥 *Chat:* \`${chatOrigen}\`\n` +
                           `👤 *Usuario:* @${usuario.split('@')[0]}\n` +
                           `❌ *Error:* ${error.message || error}\n\n` +
                           `💻 *Stack:* \n\`\`\`${error.stack || 'No disponible'}\`\`\``

        await sock.sendMessage(GRUPO_OWNERS, { 
            text: textoError,
            mentions: [usuario]
        })
    } catch (sendErr) {
        console.error('No se pudo enviar el reporte de error a WhatsApp:', sendErr)
    }
}