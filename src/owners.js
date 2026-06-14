import db from './db.js'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'

const OWNER_PRINCIPAL = '122218159816809@lid2'
const OWNERS_GROUP = '120363425755647814@g.us'

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOwners() {
    const [rows] = await db.execute("SELECT jid FROM usuarios WHERE es_owner = 1")
    return rows.map(r => r.jid)
}

export async function isOwner(jid) {
    if (jid === OWNER_PRINCIPAL) return true
    const [rows] = await db.execute("SELECT es_owner FROM usuarios WHERE jid = ?", [jid])
    return rows.length > 0 && rows[0].es_owner === 1
}

export async function getMutedUsers() {
    try {
        const [rows] = await db.execute("SELECT jid FROM usuarios WHERE muteado = 1")
        return rows.map(r => r.jid)
    } catch { return [] }
}

function getMencionado(mensaje) {
    return mensaje.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null
}

async function notificarPrivado(sock, jid, tipo, subtipo) {
    try {
        await sock.sendMessage(jid, {
            text: `⏰ *Nexo-Bot — Membresía vencida*\n\nTu membresía *${subtipo} ${tipo}* ha llegado a su fin.\n\nSi deseas renovarla escribe *.buy${tipo.toLowerCase()}* en cualquier grupo. 🎁`
        })
    } catch {}
}

export async function verificarExpiraciones(sock) {
    try {
        const [vipsExp] = await db.execute(
            "SELECT jid, vip_tipo FROM usuarios WHERE vip = 1 AND vip_expira IS NOT NULL AND vip_expira <= NOW()"
        )
        for (const row of vipsExp) {
            const subtipo = row.vip_tipo === 'ultra' ? 'Ultra' : 'Normal'
            await db.execute("UPDATE usuarios SET vip = 0, vip_tipo = NULL, vip_expira = NULL WHERE jid = ?", [row.jid])
            await notificarPrivado(sock, row.jid, 'VIP', subtipo)
        }

        const [negExp] = await db.execute(
            "SELECT jid, negocio_tipo FROM usuarios WHERE negocio = 1 AND negocio_expira IS NOT NULL AND negocio_expira <= NOW()"
        )
        for (const row of negExp) {
            const subtipo = row.negocio_tipo === 'ultra' ? 'Ultra' : 'Normal'
            await db.execute("UPDATE usuarios SET negocio = 0, negocio_tipo = NULL, negocio_expira = NULL WHERE jid = ?", [row.jid])
            await notificarPrivado(sock, row.jid, 'Negocio', subtipo)
        }
    } catch (e) {
        console.error('[verificarExpiraciones]', e.message)
    }
}

// ─── Comandos ─────────────────────────────────────────────────────────────────

const owners = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid
        const cmd = args[0]?.toLowerCase()

        if (!(await isOwner(userJid))) {
            await sock.sendMessage(jid, { text: `🔒 *Solo owners pueden usar este comando.*` }, { quoted: mensaje })
            return
        }

        // ── addowner ──────────────────────────────────────────────────────────
        if (cmd === 'addowner') {
            const target = getMencionado(mensaje)
            if (!target) return sock.sendMessage(jid, { text: `❌ Uso: *.addowner @usuario*` }, { quoted: mensaje })
            if (target === OWNER_PRINCIPAL) return sock.sendMessage(jid, { text: `👑 Este usuario ya es el dueño principal de Nexo-Bot.` }, { quoted: mensaje })
            await db.execute("UPDATE usuarios SET es_owner = 1 WHERE jid = ?", [target])
            await sock.sendMessage(jid, {
                text: `✅ @${target.split('@')[0]} ahora es *Owner* de Nexo-Bot.`,
                mentions: [target]
            }, { quoted: mensaje })
        }

        // ── delowner ──────────────────────────────────────────────────────────
        else if (cmd === 'delowner') {
            const target = getMencionado(mensaje)
            if (!target) return sock.sendMessage(jid, { text: `❌ Uso: *.delowner @usuario*` }, { quoted: mensaje })
            if (target === OWNER_PRINCIPAL) return sock.sendMessage(jid, { text: `🚫 Este usuario es el dueño de Nexo-Bot, no lo puedes quitar de owner.` }, { quoted: mensaje })
            await db.execute("UPDATE usuarios SET es_owner = 0 WHERE jid = ?", [target])
            await sock.sendMessage(jid, {
                text: `✅ @${target.split('@')[0]} fue removido de los Owners.`,
                mentions: [target]
            }, { quoted: mensaje })
        }

        // ── banuser ───────────────────────────────────────────────────────────
        else if (cmd === 'banuser') {
            const target = getMencionado(mensaje)
            const motivo = args.slice(2).join(' ') || 'Sin motivo especificado'
            if (!target) return sock.sendMessage(jid, { text: `❌ Uso: *.banuser @usuario <motivo>*` }, { quoted: mensaje })
            if (target === OWNER_PRINCIPAL) return sock.sendMessage(jid, { text: `🚫 No puedes banear al dueño de Nexo-Bot.` }, { quoted: mensaje })
            await db.execute("DELETE FROM usuarios WHERE jid = ?", [target])
            await db.execute("DELETE FROM inventario_usuario WHERE jid = ?", [target])
            await db.execute("DELETE FROM items_activos WHERE jid = ?", [target])
            await db.execute("DELETE FROM bodega WHERE jid = ?", [target])
            await db.execute(
                "INSERT INTO baneados (jid, motivo, fecha) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE motivo = ?, fecha = NOW()",
                [target, motivo, motivo]
            )
            try { await sock.sendMessage(target, { text: `🚫 *Has sido baneado de Nexo-Bot.*\n\n📋 Motivo: ${motivo}` }) } catch {}
            await sock.sendMessage(jid, {
                text: `✅ @${target.split('@')[0]} ha sido *baneado*.\n📋 Motivo: ${motivo}`,
                mentions: [target]
            }, { quoted: mensaje })
        }

        // ── unbanuser ─────────────────────────────────────────────────────────
        else if (cmd === 'unbanuser') {
            const target = getMencionado(mensaje)
            if (!target) return sock.sendMessage(jid, { text: `❌ Uso: *.unbanuser @usuario*` }, { quoted: mensaje })
            await db.execute("DELETE FROM baneados WHERE jid = ?", [target])
            try { await sock.sendMessage(target, { text: `✅ *Has sido desbaneado de Nexo-Bot.* ¡Bienvenido de vuelta!` }) } catch {}
            await sock.sendMessage(jid, {
                text: `✅ @${target.split('@')[0]} fue *desbaneado*.`,
                mentions: [target]
            }, { quoted: mensaje })
        }

        // ── mute ──────────────────────────────────────────────────────────────
        else if (cmd === 'mute') {
            const target = getMencionado(mensaje)
            if (!target) return sock.sendMessage(jid, { text: `❌ Uso: *.mute @usuario*` }, { quoted: mensaje })
            await db.execute("UPDATE usuarios SET muteado = 1 WHERE jid = ?", [target])
            await sock.sendMessage(jid, {
                text: `🔇 @${target.split('@')[0]} ha sido *muteado*. El bot ignorará sus comandos.`,
                mentions: [target]
            }, { quoted: mensaje })
        }

        // ── unmute ────────────────────────────────────────────────────────────
        else if (cmd === 'unmute') {
            const target = getMencionado(mensaje)
            if (!target) return sock.sendMessage(jid, { text: `❌ Uso: *.unmute @usuario*` }, { quoted: mensaje })
            await db.execute("UPDATE usuarios SET muteado = 0 WHERE jid = ?", [target])
            await sock.sendMessage(jid, {
                text: `🔊 @${target.split('@')[0]} fue *desmuteado*.`,
                mentions: [target]
            }, { quoted: mensaje })
        }

        // ── coronar ───────────────────────────────────────────────────────────
        else if (cmd === 'coronar') {
            const target = getMencionado(mensaje)
            if (!target) return sock.sendMessage(jid, { text: `❌ Uso: *.coronar @usuario*` }, { quoted: mensaje })
            try {
                await sock.groupParticipantsUpdate(jid, [target], 'promote')
                await sock.sendMessage(jid, {
                    text: `👑 @${target.split('@')[0]} ahora es *administrador* del grupo.`,
                    mentions: [target]
                }, { quoted: mensaje })
            } catch {
                await sock.sendMessage(jid, { text: `❌ No tengo permisos de admin para hacer esto.` }, { quoted: mensaje })
            }
        }

        // ── demoteall ─────────────────────────────────────────────────────────
        else if (cmd === 'demoteall') {
            try {
                const metadata = await sock.groupMetadata(jid)
                const admins = metadata.participants.filter(p => p.admin && p.id !== sock.user?.id)
                if (admins.length === 0) return sock.sendMessage(jid, { text: `ℹ️ No hay admins para quitar.` }, { quoted: mensaje })
                for (const a of admins) {
                    try { await sock.groupParticipantsUpdate(jid, [a.id], 'demote') } catch {}
                }
                await sock.sendMessage(jid, { text: `✅ Se quitó el admin a *${admins.length}* usuarios.` }, { quoted: mensaje })
            } catch {
                await sock.sendMessage(jid, { text: `❌ No tengo permisos de admin.` }, { quoted: mensaje })
            }
        }

        // ── nuke ──────────────────────────────────────────────────────────────
        else if (cmd === 'nuke') {
            try {
                const metadata = await sock.groupMetadata(jid)
                const miembros = metadata.participants.filter(p => !p.admin && p.id !== sock.user?.id)
                await sock.sendMessage(jid, { text: `💣 *NUKE activado* — Expulsando ${miembros.length} usuarios...` })
                for (const m of miembros) {
                    try { await sock.groupParticipantsUpdate(jid, [m.id], 'remove') } catch {}
                }
                await sock.sendMessage(jid, { text: `✅ Nuke completado.` })
            } catch {
                await sock.sendMessage(jid, { text: `❌ No tengo permisos para expulsar usuarios.` }, { quoted: mensaje })
            }
        }

        // ── add ───────────────────────────────────────────────────────────────
        else if (cmd === 'add') {
            const recurso = args[1]?.toLowerCase()
            const cantidad = parseInt(args[2])
            const target = getMencionado(mensaje)
            const validos = ['monedas', 'banco', 'xp', 'nivel']
            if (!recurso || isNaN(cantidad) || !target || !validos.includes(recurso)) {
                return sock.sendMessage(jid, {
                    text: `❌ Uso: *.add <recurso> <cantidad> @usuario*\nRecursos válidos: ${validos.join(', ')}`
                }, { quoted: mensaje })
            }
            await db.execute(`UPDATE usuarios SET ${recurso} = ${recurso} + ? WHERE jid = ?`, [cantidad, target])
            await sock.sendMessage(jid, {
                text: `✅ Se añadieron *${cantidad} ${recurso}* a @${target.split('@')[0]}.`,
                mentions: [target]
            }, { quoted: mensaje })
        }

        // ── penalizar ─────────────────────────────────────────────────────────
        else if (cmd === 'penalizar') {
            const recurso = args[1]?.toLowerCase()
            const cantidad = parseInt(args[2])
            const target = getMencionado(mensaje)
            const validos = ['monedas', 'banco', 'xp', 'nivel']
            if (!recurso || isNaN(cantidad) || !target || !validos.includes(recurso)) {
                return sock.sendMessage(jid, {
                    text: `❌ Uso: *.penalizar <recurso> <cantidad> @usuario*\nRecursos válidos: ${validos.join(', ')}`
                }, { quoted: mensaje })
            }
            await db.execute(`UPDATE usuarios SET ${recurso} = GREATEST(0, ${recurso} - ?) WHERE jid = ?`, [cantidad, target])
            await sock.sendMessage(jid, {
                text: `⚠️ Se penalizaron *${cantidad} ${recurso}* a @${target.split('@')[0]}.`,
                mentions: [target]
            }, { quoted: mensaje })
        }

        // ── addvip ────────────────────────────────────────────────────────────
        else if (cmd === 'addvip') {
            const horas = parseInt(args[1])
            const target = getMencionado(mensaje)
            if (!target || isNaN(horas) || horas <= 0) return sock.sendMessage(jid, { text: `❌ Uso: *.addvip <horas> @usuario*` }, { quoted: mensaje })
            await db.execute(
                `UPDATE usuarios SET vip = 1, vip_tipo = 'normal', vip_expira = DATE_ADD(NOW(), INTERVAL ? HOUR) WHERE jid = ?`,
                [horas, target]
            )
            try { await sock.sendMessage(target, { text: `🌟 *¡Felicidades!* Un owner te ha dado *VIP Normal* por *${horas} horas* en Nexo-Bot. ¡Disfrútalo! ✨` }) } catch {}
            await sock.sendMessage(jid, {
                text: `✅ @${target.split('@')[0]} tiene *VIP Normal* por *${horas} horas*.`,
                mentions: [target]
            }, { quoted: mensaje })
        }

        // ── addvip-ultra ──────────────────────────────────────────────────────
        else if (cmd === 'addvip-ultra') {
            const horas = parseInt(args[1])
            const target = getMencionado(mensaje)
            if (!target || isNaN(horas) || horas <= 0) return sock.sendMessage(jid, { text: `❌ Uso: *.addvip-ultra <horas> @usuario*` }, { quoted: mensaje })
            await db.execute(
                `UPDATE usuarios SET vip = 1, vip_tipo = 'ultra', vip_expira = DATE_ADD(NOW(), INTERVAL ? HOUR) WHERE jid = ?`,
                [horas, target]
            )
            try { await sock.sendMessage(target, { text: `👑 *¡Felicidades!* Un owner te ha dado *VIP Ultra* por *${horas} horas* en Nexo-Bot. ¡Disfruta todos los beneficios premium! ✨` }) } catch {}
            await sock.sendMessage(jid, {
                text: `✅ @${target.split('@')[0]} tiene *VIP Ultra* por *${horas} horas*.`,
                mentions: [target]
            }, { quoted: mensaje })
        }

        // ── addnegocio ────────────────────────────────────────────────────────
        else if (cmd === 'addnegocio') {
            const horas = parseInt(args[1])
            const target = getMencionado(mensaje)
            if (!target || isNaN(horas) || horas <= 0) return sock.sendMessage(jid, { text: `❌ Uso: *.addnegocio <horas> @usuario*` }, { quoted: mensaje })
            await db.execute(
                `UPDATE usuarios SET negocio = 1, negocio_tipo = 'normal', negocio_expira = DATE_ADD(NOW(), INTERVAL ? HOUR) WHERE jid = ?`,
                [horas, target]
            )
            try { await sock.sendMessage(target, { text: `🏢 *¡Felicidades!* Un owner te dio *Negocio Normal* por *${horas} horas*. ¡A crecer! 💼` }) } catch {}
            await sock.sendMessage(jid, {
                text: `✅ @${target.split('@')[0]} tiene *Negocio Normal* por *${horas} horas*.`,
                mentions: [target]
            }, { quoted: mensaje })
        }

        // ── addnegocio-ultra ──────────────────────────────────────────────────
        else if (cmd === 'addnegocio-ultra') {
            const horas = parseInt(args[1])
            const target = getMencionado(mensaje)
            if (!target || isNaN(horas) || horas <= 0) return sock.sendMessage(jid, { text: `❌ Uso: *.addnegocio-ultra <horas> @usuario*` }, { quoted: mensaje })
            await db.execute(
                `UPDATE usuarios SET negocio = 1, negocio_tipo = 'ultra', negocio_expira = DATE_ADD(NOW(), INTERVAL ? HOUR) WHERE jid = ?`,
                [horas, target]
            )
            try { await sock.sendMessage(target, { text: `🏢 *¡Felicidades!* Un owner te dio *Negocio Ultra* por *${horas} horas*. ¡Todos los comandos desbloqueados! 💎` }) } catch {}
            await sock.sendMessage(jid, {
                text: `✅ @${target.split('@')[0]} tiene *Negocio Ultra* por *${horas} horas*.`,
                mentions: [target]
            }, { quoted: mensaje })
        }

        // ── addstock ──────────────────────────────────────────────────────────
        else if (cmd === 'addstock') {
            const cantidad = parseInt(args[1])
            const objeto = args.slice(2).join('_').toLowerCase()
            if (isNaN(cantidad) || !objeto) return sock.sendMessage(jid, { text: `❌ Uso: *.addstock <cantidad> <nombre_objeto>*` }, { quoted: mensaje })
            const [existe] = await db.execute("SELECT item FROM tienda WHERE item = ?", [objeto])
            if (existe.length === 0) return sock.sendMessage(jid, { text: `❌ El objeto *${objeto}* no existe en la tienda.` }, { quoted: mensaje })
            await db.execute("UPDATE tienda SET stock = stock + ? WHERE item = ?", [cantidad, objeto])
            await sock.sendMessage(jid, { text: `✅ +${cantidad} unidades de *${objeto}* añadidas al stock.` }, { quoted: mensaje })
        }

        // ── resetstock ────────────────────────────────────────────────────────
        else if (cmd === 'resetstock') {
            await db.execute("UPDATE tienda SET stock = 10")
            await sock.sendMessage(jid, { text: `✅ Stock de todos los objetos reiniciado a *10 unidades*.` }, { quoted: mensaje })
        }

        // ── adjustprices ──────────────────────────────────────────────────────
        else if (cmd === 'adjustprices') {
            const objeto = args[1]?.toLowerCase()
            const precio = parseInt(args[2])
            if (!objeto || isNaN(precio) || precio <= 0) {
                return sock.sendMessage(jid, {
                    text: `❌ Uso: *.adjustprices <objeto> <precio>*\nEjemplo: *.adjustprices espada_basica 9000*`
                }, { quoted: mensaje })
            }
            const [existe] = await db.execute("SELECT item FROM tienda WHERE item = ?", [objeto])
            if (existe.length === 0) return sock.sendMessage(jid, { text: `❌ El objeto *${objeto}* no existe.` }, { quoted: mensaje })
            await db.execute("UPDATE tienda SET precio = ?, ultimo_precio_cambio = NOW() WHERE item = ?", [precio, objeto])
            await sock.sendMessage(jid, { text: `✅ Precio de *${objeto}* ajustado a *${precio} monedas*.` }, { quoted: mensaje })
        }

        // ── ordenartienda ─────────────────────────────────────────────────────
        else if (cmd === 'ordenartienda') {
            const [items] = await db.execute("SELECT item, nombre, precio FROM tienda ORDER BY precio ASC")
            if (items.length === 0) return sock.sendMessage(jid, { text: `❌ La tienda está vacía.` }, { quoted: mensaje })
            const lista = items.map((it, i) => `${i + 1}. ${it.nombre || it.item} — ${it.precio} 💰`).join('\n')
            await sock.sendMessage(jid, { text: `🛒 *TIENDA — Ordenada por precio*\n\n${lista}` }, { quoted: mensaje })
        }

        // ── aviso ─────────────────────────────────────────────────────────────
        else if (cmd === 'aviso') {
            const msj = args.slice(1).join(' ')
            if (!msj) return sock.sendMessage(jid, { text: `❌ Uso: *.aviso <mensaje>*` }, { quoted: mensaje })
            const grupos = await sock.groupFetchAllParticipating()
            let enviados = 0
            for (const gid of Object.keys(grupos)) {
                try {
                    await sock.sendMessage(gid, {
                        text: `📢 *AVISO DE NEXO-BOT*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${msj}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n👑 *Nexo-Bot Team*`
                    })
                    enviados++
                } catch {}
            }
            await sock.sendMessage(jid, { text: `✅ Aviso enviado a *${enviados} grupos*.` }, { quoted: mensaje })
        }

        // ── reunion ───────────────────────────────────────────────────────────
        else if (cmd === 'reunion') {
            const msj = args.slice(1).join(' ')
            if (!msj) return sock.sendMessage(jid, { text: `❌ Uso: *.reunion <mensaje>*` }, { quoted: mensaje })
            const ownerList = await getOwners()
            if (!ownerList.includes(OWNER_PRINCIPAL)) ownerList.push(OWNER_PRINCIPAL)
            await sock.sendMessage(OWNERS_GROUP, {
                text: `📣 *REUNIÓN DE OWNERS*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${msj}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nConvocado por @${userJid.split('@')[0]}`,
                mentions: [userJid, ...ownerList]
            })
            await sock.sendMessage(jid, { text: `✅ Reunión enviada al grupo de owners.` }, { quoted: mensaje })
        }

        // ── drop ──────────────────────────────────────────────────────────────
        else if (cmd === 'drop') {
            const objeto = args[1]?.toLowerCase()
            const cantidad = parseInt(args[2]) || 1
            if (!objeto) return sock.sendMessage(jid, { text: `❌ Uso: *.drop <objeto> <cantidad>*` }, { quoted: mensaje })
            const [existe] = await db.execute("SELECT item FROM tienda WHERE item = ?", [objeto])
            if (existe.length === 0) return sock.sendMessage(jid, { text: `❌ El objeto *${objeto}* no existe en la tienda.` }, { quoted: mensaje })
            const [usuarios] = await db.execute("SELECT jid FROM usuarios")
            for (const u of usuarios) {
                try {
                    await db.execute(
                        "INSERT INTO inventario_usuario (jid, item, cantidad) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE cantidad = cantidad + ?",
                        [u.jid, objeto, cantidad, cantidad]
                    )
                } catch {}
            }
            await sock.sendMessage(jid, {
                text: `🎁 *DROP activado!*\n*${cantidad}x ${objeto}* regalado a *${usuarios.length} usuarios*.`
            }, { quoted: mensaje })
        }

        // ── eventocm ──────────────────────────────────────────────────────────
        else if (cmd === 'eventocm') {
            const cantidad = 5000
            const [usuarios] = await db.execute("SELECT jid FROM usuarios")
            for (const u of usuarios) {
                try { await db.execute("UPDATE usuarios SET monedas = monedas + ? WHERE jid = ?", [cantidad, u.jid]) } catch {}
            }
            const grupos = await sock.groupFetchAllParticipating()
            for (const gid of Object.keys(grupos)) {
                try {
                    await sock.sendMessage(gid, {
                        text: `🎉 *¡EVENTO ESPECIAL!* 🎉\n\nTodos los usuarios registrados reciben *${cantidad} monedas* de regalo.\n\n✨ ¡Disfrútalas! — Nexo-Bot Team`
                    })
                } catch {}
            }
            await sock.sendMessage(jid, { text: `✅ Evento completado. *${cantidad} monedas* dadas a *${usuarios.length} usuarios*.` }, { quoted: mensaje })
        }

        // ── backup ────────────────────────────────────────────────────────────
        else if (cmd === 'backup') {
            await sock.sendMessage(jid, { text: `⏳ Generando backup...` }, { quoted: mensaje })
            const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
            const ruta = `/root/backups/nexobot_${fecha}.sql`
            exec(`mkdir -p /root/backups && mysqldump -u root nexobot > ${ruta}`, async (err) => {
                if (err) {
                    await sock.sendMessage(jid, { text: `❌ Error al generar backup: ${err.message}` }, { quoted: mensaje })
                } else {
                    await sock.sendMessage(jid, { text: `✅ Backup guardado en:\n\`${ruta}\`` }, { quoted: mensaje })
                }
            })
        }

        // ── pandabotlogs ──────────────────────────────────────────────────────
        else if (cmd === 'pandabotlogs') {
            exec('pm2 logs nexo-bot --lines 30 --nostream', async (err, stdout, stderr) => {
                const output = (stdout || stderr || 'Sin logs disponibles').slice(-3000)
                await sock.sendMessage(jid, {
                    text: `📋 *LOGS — últimas 30 líneas*\n\n\`\`\`${output}\`\`\``
                }, { quoted: mensaje })
            })
        }

        // ── getcommand ────────────────────────────────────────────────────────
        else if (cmd === 'getcommand') {
            const nombre = args[1]?.toLowerCase()
            if (!nombre) return sock.sendMessage(jid, { text: `❌ Uso: *.getcommand <nombre>*` }, { quoted: mensaje })
            const ruta = path.resolve(`./src/${nombre}.js`)
            if (!fs.existsSync(ruta)) return sock.sendMessage(jid, { text: `❌ No existe el plugin *${nombre}.js*.` }, { quoted: mensaje })
            const codigo = fs.readFileSync(ruta, 'utf-8').slice(0, 3000)
            await sock.sendMessage(jid, { text: `📄 *Código de ${nombre}.js*\n\n\`\`\`${codigo}\`\`\`` }, { quoted: mensaje })
        }

        // ── reiniciar ─────────────────────────────────────────────────────────
        else if (cmd === 'reiniciar') {
            await sock.sendMessage(jid, { text: `🔄 Reiniciando Nexo-Bot...` }, { quoted: mensaje })
            setTimeout(() => exec('pm2 restart nexo-bot'), 1500)
        }

        // ── reply ─────────────────────────────────────────────────────────────
        else if (cmd === 'reply') {
            const id = args[1]
            const respuesta = args.slice(2).join(' ')
            if (!id || !respuesta) return sock.sendMessage(jid, { text: `❌ Uso: *.reply <ID> <respuesta>*` }, { quoted: mensaje })
            try {
                const [rows] = await db.execute("SELECT * FROM solicitudes_bot WHERE id = ?", [id])
                if (rows.length === 0) return sock.sendMessage(jid, { text: `❌ No existe la solicitud #${id}.` }, { quoted: mensaje })
                const sol = rows[0]
                try {
                    await sock.sendMessage(sol.jid, {
                        text: `📩 *Nexo-Bot — Respuesta a tu solicitud #${id}*\n\n📝 Tu mensaje: "${sol.mensaje}"\n\n💬 Respuesta:\n${respuesta}\n\n— 👑 Nexo-Bot Team`
                    })
                } catch {}
                await db.execute("UPDATE solicitudes_bot SET respondida = 1 WHERE id = ?", [id])
                await sock.sendMessage(jid, { text: `✅ Respuesta enviada al usuario de la solicitud #${id}.` }, { quoted: mensaje })
            } catch {
                await sock.sendMessage(jid, { text: `❌ Error. Verifica que la tabla *solicitudes_bot* exista.` }, { quoted: mensaje })
            }
        }

        // ── makecode ──────────────────────────────────────────────────────────
        else if (cmd === 'makecode') {
            const nombre = args[1]
            const cantidad = parseInt(args[2])
            const usos = parseInt(args[3])
            if (!nombre || isNaN(cantidad) || isNaN(usos) || usos <= 0) {
                return sock.sendMessage(jid, {
                    text: `❌ Uso: *.makecode <nombre> <cantidad> <usos>*\n\nCantidad negativa quita monedas.\nEjemplo: *.makecode PROMO25 5000 10*`
                }, { quoted: mensaje })
            }
            try {
                await db.execute(
                    "INSERT INTO codigos (codigo, cantidad, usos_max, usos_usados, creado) VALUES (?, ?, ?, 0, NOW())",
                    [nombre.toUpperCase(), cantidad, usos]
                )
                await sock.sendMessage(jid, {
                    text: `✅ *Código creado:*\n\n🎟️ Código: *${nombre.toUpperCase()}*\n💰 Valor: *${cantidad} monedas*\n🔁 Usos: *${usos}*`
                }, { quoted: mensaje })
            } catch {
                await sock.sendMessage(jid, { text: `❌ Error al crear el código. Puede que ya exista uno con ese nombre.` }, { quoted: mensaje })
            }
        }

        // ── viewcodes ─────────────────────────────────────────────────────────
        else if (cmd === 'viewcodes') {
            try {
                const [codes] = await db.execute(
                    "SELECT codigo, cantidad, usos_max, usos_usados FROM codigos WHERE usos_usados < usos_max ORDER BY creado DESC"
                )
                if (codes.length === 0) return sock.sendMessage(jid, { text: `📭 No hay códigos activos.` }, { quoted: mensaje })
                const lista = codes.map(c =>
                    `🎟️ *${c.codigo}* — ${c.cantidad > 0 ? '+' : ''}${c.cantidad} 💰 | ${c.usos_usados}/${c.usos_max} usos`
                ).join('\n')
                await sock.sendMessage(jid, { text: `🎟️ *CÓDIGOS ACTIVOS*\n\n${lista}` }, { quoted: mensaje })
            } catch {
                await sock.sendMessage(jid, { text: `❌ Error. Verifica que la tabla *codigos* exista.` }, { quoted: mensaje })
            }
        }

        // ── defecar ───────────────────────────────────────────────────────────
        else if (cmd === 'defecar') {
            const target = getMencionado(mensaje)
            if (!target) return sock.sendMessage(jid, { text: `❌ Menciona a alguien. Ej: *.defecar @usuario*` }, { quoted: mensaje })
            const frases = [
                `💩 @${userJid.split('@')[0]} se subió encima de @${target.split('@')[0]} y depositó un regalo. Qué asco.`,
                `💩 @${target.split('@')[0]} recibió una "ducha especial" de @${userJid.split('@')[0]}. El olor es indescriptible.`,
                `💩 @${userJid.split('@')[0]} se bajó los pantalones delante de @${target.split('@')[0]}. Sin palabras.`
            ]
            await sock.sendMessage(jid, {
                text: frases[Math.floor(Math.random() * frases.length)],
                mentions: [userJid, target]
            }, { quoted: mensaje })
        }

        else {
            await sock.sendMessage(jid, {
                text: `❓ Subcomando no reconocido. Usa *.menu 19* para ver los comandos disponibles.`
            }, { quoted: mensaje })
        }
    }
}

export default owners
