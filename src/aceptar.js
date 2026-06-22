import db from './db.js'
import {
    verificarLimiteDiarioIngresos,
    registrarIngresoGrupo,
    asegurarTablasReputacionGrupos,
} from './reputacionGrupos.js'

const OWNERS_JID = '120363425755647814@g.us'
const MINIMO_MIEMBROS = 10

const aceptar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid

        if (jid !== OWNERS_JID) return

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: `❌ Debes indicar el  número de solicitud.\n\n📌 Ejemplo: *.aceptar 001*`
            }, { quoted: mensaje })
            return
        }

        const id = parseInt(args[0])

        const [rows] = await db.execute(
            'SELECT * FROM solicitudes WHERE id = ?',
            [id]
        )

        if (rows.length === 0) {
            await sock.sendMessage(jid, {
                text: `❌ No existe la solicitud *#${String(id).padStart(3, '0')}*.`
            }, { quoted: mensaje })
            return
        }

        const solicitud = rows[0]

        if (solicitud.estado !== 'pendiente') {
            await sock.sendMessage(jid, {
                text: `⚠️ La solicitud *#${String(id).padStart(3, '0')}* ya fue *${solicitud.estado}*.`
            }, { quoted: mensaje })
            return
        }

        const numeroSolicitud = String(id).padStart(3, '0')

        // ── LÍMITE DIARIO DE INGRESOS A GRUPOS ──────────────────────
        // Tope permanente de negocio (independiente de la rampa de
        // activación post-reconexión): evita que el bot entre a
        // demasiados grupos nuevos en un solo día.
        await asegurarTablasReputacionGrupos()
        const limite = await verificarLimiteDiarioIngresos()
        if (!limite.permitido) {
            await sock.sendMessage(jid, {
                text: `⛔ *Límite diario alcanzado.*\n\nYa se aceptaron *${limite.actual}/${limite.limite}* grupos hoy.\n\n💡 La solicitud *#${numeroSolicitud}* sigue pendiente — podrás aceptarla mañana cuando el contador se reinicie.`
            }, { quoted: mensaje })
            return
        }
        // ──────────────────────────────────────────────────────────────

        // Extraer código SIN modificar mayúsculas/minúsculas
        const codigo = solicitud.link.split('https://chat.whatsapp.com/')[1]?.split('?')[0]?.trim()

        if (!codigo) {
            await sock.sendMessage(jid, {
                text: `❌ El link de la solicitud *#${numeroSolicitud}* es inválido.`
            }, { quoted: mensaje })
            return
        }

        console.log(`🔗 Código original: ${codigo}`)

        let jidGrupoNuevo = null

        try {
            jidGrupoNuevo = await sock.groupAcceptInvite(codigo)

            // ── VERIFICACIÓN REAL DE 10 MIEMBROS MÍNIMO ──────────────
            // Antes solo se exigía por texto en addbot.js; ahora se
            // valida de verdad contra los metadatos reales del grupo
            // justo después de entrar. Si no cumple, el bot sale de
            // inmediato y la solicitud queda marcada como rechazada
            // (no consume el cupo del límite diario).
            let totalMiembros = 0
            try {
                const metadata = await sock.groupMetadata(jidGrupoNuevo)
                totalMiembros = metadata.participants?.length || 0
            } catch {
                // Si no se puede leer metadata, no arriesgamos: tratamos
                // como si no cumpliera, mejor salir que quedarse a ciegas.
                totalMiembros = 0
            }

            if (totalMiembros < MINIMO_MIEMBROS) {
                try { await sock.groupLeave(jidGrupoNuevo) } catch {}

                await db.execute(
                    'UPDATE solicitudes SET estado = "rechazada" WHERE id = ?',
                    [id]
                )

                await sock.sendMessage(jid, {
                    text: `🚪 *Solicitud #${numeroSolicitud} rechazada automáticamente.*\n\n` +
                          `📊 El grupo *${solicitud.nombre}* tiene *${totalMiembros} miembros*, menos del mínimo requerido (*${MINIMO_MIEMBROS}*).\n\n` +
                          `El bot salió del grupo. Este intento NO consumió el cupo diario.`
                }, { quoted: mensaje })

                try {
                    await sock.sendMessage(solicitud.jid, {
                        text: `❌ *Tu solicitud fue rechazada.*\n\n📋 Solicitud: *#${numeroSolicitud}*\n\n⚠️ El grupo no alcanza el mínimo de *${MINIMO_MIEMBROS} integrantes* requerido.\n\n💬 Cuando el grupo crezca, puedes enviar una nueva solicitud.`
                    })
                } catch {}

                return
            }
            // ──────────────────────────────────────────────────────────────

            await db.execute(
                'UPDATE solicitudes SET estado = "aceptada" WHERE id = ?',
                [id]
            )
            await registrarIngresoGrupo()

            await sock.sendMessage(jid, {
                text: `✅ Solicitud *#${numeroSolicitud}* aceptada.\n\n🤖 El bot entró al grupo de *${solicitud.nombre}* correctamente.\n👥 *Miembros verificados:* ${totalMiembros}\n📊 *Cupo diario usado:* ${limite.actual + 1}/${limite.limite}`
            }, { quoted: mensaje })

            await sock.sendMessage(solicitud.jid, {
                text: `🎉 *¡Tu solicitud ha sido aceptada!*\n\n📋 Solicitud: *#${numeroSolicitud}*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ El bot ya está en tu grupo.\n\nEscribe *.menu* para ver todos los comandos. 🚀`
            })

        } catch (err) {
            console.error('Error al unirse:', err.message)

            await sock.sendMessage(jid, {
                text: `⚠️ No se pudo unir al grupo.\n\n❌ *Error:* ${err.message}\n🔗 *Código:* ${codigo}\n\nEl link puede haber expirado. Pídele al usuario un link nuevo.`
            }, { quoted: mensaje })
        }
    }
}

export default aceptar