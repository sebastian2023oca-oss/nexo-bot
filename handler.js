import ping from './src/ping.js'
import saludo from './src/saludo.js'
import menu from './src/menu.js'
import chiste from './src/chiste.js'
import autoRegistrar from './src/autoRegistrar.js'
import addbot from './src/addbot.js'
import solicitudes from './src/solicitudes.js'
import aceptar from './src/aceptar.js'
import rechazar from './src/rechazar.js'

// Perfil & Registro
import perfil from './src/perfil.js'
import nivel from './src/nivel.js'
import xp from './src/xp.js'
import stats from './src/stats.js'
import insignias from './src/insignias.js'
import rank from './src/rank.js'
import top from './src/top.js'
import setbio from './src/setbio.js'
import setstatus from './src/setstatus.js'
import setname from './src/setname.js'
import resetperfil from './src/resetperfil.js'
import reputacion from './src/reputacion.js'
import followers from './src/followers.js'
import follow from './src/follow.js'
import block from './src/block.js'
import id from './src/id.js'
import avatar from './src/avatar.js'

const PREFIJO = '.'

const comandos = {
    ping,
    saludo,
    menu,
    chiste,
    addbot,
    solicitudes,
    aceptar,
    rechazar,
    perfil,
    nivel,
    xp,
    stats,
    insignias,
    rank,
    top,
    setbio,
    setstatus,
    setname,
    resetperfil,
    reputacion,
    followers,
    follow,
    block,
    id,
    avatar,
}

const permitidosEnPrivado = ['addbot']

function obtenerTexto(mensaje) {
    const m = mensaje.message
    return (
        m?.conversation ||
        m?.extendedTextMessage?.text ||
        m?.imageMessage?.caption ||
        m?.videoMessage?.caption ||
        ''
    ).trim()
}

async function manejarMensaje(sock, mensaje) {
    const jid = mensaje.key.remoteJid
    const esGrupo = jid?.endsWith('@g.us')

    if (esGrupo) {
        await autoRegistrar(sock, mensaje)
    }

    const texto = obtenerTexto(mensaje)

    if (!texto.startsWith(PREFIJO)) return

    const partes = texto.slice(PREFIJO.length).trim().split(/\s+/)
    const cmd = partes[0].toLowerCase()
    const args = partes.slice(1)

    if (!esGrupo && !permitidosEnPrivado.includes(cmd)) {
        await sock.sendMessage(jid, {
            text: `⚠️ *Este bot solo funciona en grupos.*\n\nPara añadirlo a tu grupo usa:\n  ✦ *.addbot <link del grupo>* (sin las <>)\n\n  📌 Ejemplo:\n  *.addbot https://chat.whatsapp.com/xxxxxx*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        }, { quoted: mensaje })
        return
    }

    const comando = comandos[cmd]

    if (!comando) return

    try {
        await comando.ejecutar(sock, mensaje, args)
    } catch (error) {
        console.error(`Error ejecutando el comando "${cmd}":`, error)
    }
}

export { manejarMensaje }