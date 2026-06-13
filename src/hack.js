import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'

const hack = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        const enCooldown = await verificarCooldown(userJid, 'hack', 60)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para intentar hackear de nuevo.` }, { quoted: mensaje })
            return
        }

        const mencionado = mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        if (!mencionado) {
            await sock.sendMessage(jid, { text: `❌ Debes mencionar a un usuario.\n\n📌 Ejemplo: *.hack @usuario*` }, { quoted: mensaje })
            return
        }

        if (mencionado === userJid) {
            await sock.sendMessage(jid, { text: `❌ No puedes hackearte a ti mismo.` }, { quoted: mensaje })
            return
        }

        const [hacker] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        const [victima] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [mencionado])

        if (hacker.length === 0) { await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje }); return }
        if (victima.length === 0) { await sock.sendMessage(jid, { text: `❌ Ese usuario no está registrado.` }, { quoted: mensaje }); return }

        const bancaVictima = victima[0].banco || 0
        if (bancaVictima === 0) {
            await sock.sendMessage(jid, { text: `❌ Esa persona no tiene dinero en el banco.` }, { quoted: mensaje })
            return
        }

        // Verificar VPN de la víctima
        const [vpn] = await db.execute(
            'SELECT * FROM inventario_usuario WHERE jid = ? AND item = "vpn" AND equipado = 1',
            [mencionado]
        )
        if (vpn.length > 0) {
            // Falla 100% y se descuenta 10% al hacker
            await registrarCooldown(userJid, 'hack', 60)
            const monedashacker = hacker[0].monedas || 0
            const bancaHacker = hacker[0].banco || 0
            let multa = 0
            let textoMulta = ''

            if (monedashacker > 0) {
                multa = Math.floor(monedashacker * 0.1)
                await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [multa, userJid])
                textoMulta = `💵 Se te descontaron *${multa} monedas* de tu efectivo.`
            } else if (bancaHacker > 0) {
                multa = Math.floor(bancaHacker * 0.1)
                await db.execute('UPDATE usuarios SET banco = banco - ? WHERE jid = ?', [multa, userJid])
                textoMulta = `🏦 Se te descontaron *${multa} monedas* de tu banco.`
            }

            await sock.sendMessage(jid, {
                text: `🛡️ *¡HACK BLOQUEADO!*\n\n@${mencionado.split('@')[0]} tiene una *VPN* activa.\n\n❌ Tu ataque fue detectado y rechazado.\n${textoMulta}`,
                mentions: [mencionado]
            }, { quoted: mensaje })
            return
        }

        await registrarCooldown(userJid, 'hack', 60)

        // 50% de probabilidad
        const exito = Math.random() < 0.5

        if (!exito) {
            // Falló: descontar 10% al hacker (mano primero, luego banco)
            const monedashacker = hacker[0].monedas || 0
            const bancaHacker = hacker[0].banco || 0
            let multa = 0
            let textoMulta = ''

            if (monedashacker > 0) {
                multa = Math.floor(monedashacker * 0.1)
                await db.execute('UPDATE usuarios SET monedas = monedas - ? WHERE jid = ?', [multa, userJid])
                textoMulta = `💵 Se te descontaron *${multa} monedas* de tu efectivo.`
            } else if (bancaHacker > 0) {
                multa = Math.floor(bancaHacker * 0.1)
                await db.execute('UPDATE usuarios SET banco = banco - ? WHERE jid = ?', [multa, userJid])
                textoMulta = `🏦 Se te descontaron *${multa} monedas* de tu banco.`
            }

            await sock.sendMessage(jid, {
                text: `💻 *¡HACK FALLIDO!*\n\nFuiste detectado intentando hackear a @${mencionado.split('@')[0]}.\n\n❌ El sistema te penalizó.\n${textoMulta}`,
                mentions: [mencionado]
            }, { quoted: mensaje })
            return
        }

        // Éxito: robar entre 10% y 40% del banco de la víctima
        const robado = Math.floor(bancaVictima * (Math.random() * 0.3 + 0.1))
        await db.execute('UPDATE usuarios SET banco = banco - ? WHERE jid = ?', [robado, mencionado])
        await db.execute('UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?', [robado, userJid])

        await sock.sendMessage(jid, {
            text: `💻 *¡HACK EXITOSO!*\n\n🏦 Robaste *${robado.toLocaleString()} monedas* del banco de @${mencionado.split('@')[0]}.\n\n💵 *Tu balance:* ${(hacker[0].monedas || 0) + robado} monedas`,
            mentions: [mencionado]
        }, { quoted: mensaje })
    }
}

export default hack
