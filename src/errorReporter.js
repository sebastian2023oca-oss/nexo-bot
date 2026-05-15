import { OWNERS_JID } from './config.js'

const MAX_ERROR_LENGTH = 3500

function limpiarTexto(valor, fallback = 'No disponible') {
    if (valor === null || valor === undefined) return fallback
    const texto = String(valor).trim()
    return texto.length > 0 ? texto : fallback
}

function recortar(texto, limite = MAX_ERROR_LENGTH) {
    const valor = limpiarTexto(texto)
    if (valor.length <= limite) return valor
    return `${valor.slice(0, limite)}\n\n... Error recortado por longitud.`
}

function obtenerUsuario(mensaje) {
    return mensaje?.key?.participant || mensaje?.key?.remoteJid || 'usuario_desconocido'
}

function obtenerGrupo(mensaje) {
    const jid = mensaje?.key?.remoteJid
    if (!jid) return 'grupo_desconocido'
    return jid.endsWith('@g.us') ? jid : 'Chat privado'
}

function formatearError(error) {
    if (!error) return 'Error desconocido'
    if (error.stack) return error.stack
    if (error.message) return error.message
    return String(error)
}

export function crearMensajeErrorComando({ comandoTexto, mensaje, error }) {
    const comando = limpiarTexto(comandoTexto, 'Comando no detectado')
    const usuario = obtenerUsuario(mensaje)
    const grupo = obtenerGrupo(mensaje)
    const detalleError = recortar(formatearError(error))

    return `❌ *Error en comando*\n\n` +
        `*Comando:* ${comando}\n` +
        `*Usuario:* ${usuario}\n\n` +
        `*Grupo:* ${grupo}\n\n` +
        `*Error:* ${detalleError}`
}

export async function reportarErrorComando(sock, datos) {
    try {
        if (!sock?.sendMessage) return

        await sock.sendMessage(OWNERS_JID, {
            text: crearMensajeErrorComando(datos)
        })
    } catch (errorReporte) {
        console.error('No se pudo enviar el error al grupo de owners:', errorReporte)
    }
}
