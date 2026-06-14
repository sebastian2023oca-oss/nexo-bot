import ping from './src/ping.js'
import saludo from './src/saludo.js'
import menu from './src/menu.js'
import chiste from './src/chiste.js'
import autoRegistrar from './src/autoRegistrar.js'
import addbot from './src/addbot.js'
import solicitudes from './src/solicitudes.js'
import aceptar from './src/aceptar.js'
import rechazar from './src/rechazar.js'
import rules from './src/rules.js'

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

// Economía
import balance from './src/balance.js'
import banco from './src/banco.js'
import saldo from './src/saldo.js'
import depositar from './src/depositar.js'
import retirar from './src/retirar.js'
import work from './src/work.js'
import daily from './src/daily.js'
import interes from './src/interes.js'
import minar from './src/minar.js'
import pescar from './src/pescar.js'
import cazar from './src/cazar.js'
import recolectar from './src/recolectar.js'
import negocio from './src/negocio.js'
import repartir from './src/repartir.js'
import beg from './src/beg.js'
import transferir from './src/transferir.js'
import pagar from './src/pagar.js'
import invertir from './src/invertir.js'
import rentabilidad from './src/rentabilidad.js'
import prestamo from './src/prestamo.js'
import pagar_prestamo from './src/pagar_prestamo.js'
import aceptarprestamo from './src/aceptarprestamo.js'
import rechazarprestamo from './src/rechazarprestamo.js'
import deuda from './src/deuda.js'
import apostar from './src/apostar.js'
import loteria from './src/loteria.js'
import ruleta from './src/ruleta.js'
import robar from './src/robar.js'
import robar_item from './src/robar_item.js'
import hack from './src/hack.js'
import coinflip from './src/coinflip.js'
import slots from './src/slots.js'
import blackjack from './src/blackjack.js'
import shopcoins from './src/shopcoins.js'
import comprar from './src/comprar.js'
import topbank from './src/topbank.js'
import topmoney from './src/topmoney.js'
import expedicion from './src/expedicion.js'
import aventura from './src/aventura.js'

// Tienda & Inventario
import tienda from './src/tienda.js'
import precio from './src/precio.js'
import stock from './src/stock.js'
import inventario from './src/inventario.js'
import listar from './src/listar.js'
import usar from './src/usar.js'
import equipar from './src/equipar.js'
import desequipar from './src/desequipar.js'
import vender from './src/vender.js'
import regalar from './src/regalar.js'
import mejorar from './src/mejorar.js'
import bodega from './src/bodega.js'
import almacenar from './src/almacenar.js'
import sacar from './src/sacar.js'
import historico from './src/historico.js'

// Juegos
import trivia from './src/trivia.js'
import adivina from './src/adivina.js'
import hangman from './src/hangman.js'
import quiz from './src/quiz.js'
import mathgame from './src/mathgame.js'
import dado from './src/dado.js'
import suerte from './src/suerte.js'
import luck from './src/luck.js'
import ppt from './src/ppt.js'
import duelo from './src/duelo.js'
import speedtype from './src/speedtype.js'
import adivinanumero from './src/adivinanumero.js'
import riddle from './src/riddle.js'
import pattern from './src/pattern.js'
import memory from './src/memory.js'
import bandera from './src/bandera.js'

import db from './src/db.js'

const PREFIJO = '.'

const comandos = {
    ping, saludo, menu, chiste, addbot, solicitudes, aceptar, rechazar,
    perfil, nivel, xp, stats, insignias, rank, top,
    setbio, setstatus, setname, resetperfil, reputacion,
    followers, follow, block, id, avatar,
    balance, banco, saldo, depositar, retirar,
    work, daily, interes, minar, pescar, cazar, recolectar, negocio, repartir, beg,
    transferir, pagar,
    invertir, rentabilidad, prestamo,
    'pagar_prestamo': pagar_prestamo,
    aceptarprestamo, rechazarprestamo, deuda, apostar,
    loteria, ruleta, robar,
    'robar_item': robar_item,
    hack, coinflip, slots, blackjack,
    shopcoins, comprar, topbank, topmoney,
    expedicion, aventura,
    tienda, precio, stock, inventario, listar, usar, equipar, desequipar,
    vender, regalar, mejorar, bodega, almacenar, sacar, historico,
    trivia, adivina, hangman, quiz, mathgame,
    dado, suerte, luck,
    ppt, duelo, speedtype,
    adivinanumero, riddle, pattern, memory,
    bandera, rules,
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

async function cobrarImpuestoSilencioso(userJid) {
    try {
        const [rows] = await db.execute('SELECT monedas FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0 || !rows[0].monedas || rows[0].monedas <= 0) return
        const impuesto = Math.floor(rows[0].monedas * 0.001)
        if (impuesto > 0) {
            await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [impuesto, userJid])
        }
    } catch {}
}

async function manejarMensaje(sock, mensaje) {
    const jid = mensaje.key.remoteJid
    const esGrupo = jid?.endsWith('@g.us')

    if (esGrupo) {
        await autoRegistrar(sock, mensaje)
    }

    // Detectar imagen, sticker o video → desequipar capa_sigilo automáticamente
    const tipoMensaje = Object.keys(mensaje.message || {})[0]
    if (esGrupo && ['imageMessage', 'stickerMessage', 'videoMessage'].includes(tipoMensaje)) {
        const userJidMedia = mensaje.key.participant || mensaje.key.remoteJid
        try {
            const [tieneCapa] = await db.execute(
                'SELECT * FROM items_activos WHERE jid = ? AND item = "capa_sigilo" AND expira > NOW()',
                [userJidMedia]
            )
            if (tieneCapa.length > 0) {
                await db.execute('UPDATE inventario_usuario SET equipado = 0 WHERE jid = ? AND item = "capa_sigilo"', [userJidMedia])
                await db.execute('DELETE FROM items_activos WHERE jid = ? AND item = "capa_sigilo"', [userJidMedia])
                await db.execute(
                    'INSERT INTO cooldowns (jid, tipo, expira) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE)) ON DUPLICATE KEY UPDATE expira = DATE_ADD(NOW(), INTERVAL 15 MINUTE)',
                    [userJidMedia, 'equipar_capa_sigilo']
                )

                const [invCapa] = await db.execute(
                    'SELECT COALESCE(nivel_mejora, 0) as nivel_mejora FROM inventario_usuario WHERE jid = ? AND item = "capa_sigilo"',
                    [userJidMedia]
                )
                const nivel = invCapa[0]?.nivel_mejora || 0
                const cooldownSecs = Math.max(0, 900 - (nivel * 10))
                const cooldownMin = Math.floor(cooldownSecs / 60)
                const cooldownSec = cooldownSecs % 60

                await sock.sendMessage(jid, {
                    text: `🧥 *¡Capa de Sigilo desequipada!*\n\n@${userJidMedia.split('@')[0]} envió multimedia y su capa fue detectada.\n\n⏳ Cooldown: *${cooldownMin}m ${cooldownSec}s* para volver a equiparla.`,
                    mentions: [userJidMedia]
                })
            }
        } catch {}
        return
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

    const userJid = mensaje.key.participant || mensaje.key.remoteJid
    await cobrarImpuestoSilencioso(userJid)

    try {
        await comando.ejecutar(sock, mensaje, args)
    } catch (error) {
        console.error(`Error ejecutando el comando "${cmd}":`, error)
    }
}

export { manejarMensaje }