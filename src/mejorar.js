import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { obtenerConfigMejora } from './mejorasItems.js'

const COOLDOWN_MINUTOS = 20
const PROBABILIDAD_EXITO = 0.7
const ITEM_GEMA_MEJORA = 'gema_mejora'
const NIVEL_MAXIMO_CAPA = 5

const mejorar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: '❌ Uso correcto: *.mejorar <item>*\n\nEjemplos:\n*.mejorar pico_reforzado*\n*.mejorar caña_premium*\n*.mejorar capa_sigilo*\n\n💡 Necesitas *gema_mejora* para mejorar.'
            }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'mejorar', COOLDOWN_MINUTOS)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para mejorar de nuevo.` }, { quoted: mensaje })
            return
        }

        const itemKey = args[0].toLowerCase().trim()

        if (itemKey === ITEM_GEMA_MEJORA) {
            await sock.sendMessage(jid, {
                text: '❌ No puedes mejorar la *gema_mejora*.'
            }, { quoted: mensaje })
            return
        }

        const connection = await db.getConnection()

        try {
            await connection.beginTransaction()

            const [invItem] = await connection.execute(
                `SELECT iu.item, iu.cantidad, COALESCE(iu.nivel_mejora, 0) AS nivel_mejora, t.nombre
                 FROM inventario_usuario iu
                 INNER JOIN tienda t ON t.item COLLATE utf8mb4_general_ci = iu.item COLLATE utf8mb4_general_ci
                 WHERE iu.jid = ? AND iu.item = ?
                 LIMIT 1 FOR UPDATE`,
                [userJid, itemKey]
            )

            if (invItem.length === 0) {
                await connection.rollback()
                await sock.sendMessage(jid, {
                    text: `❌ No tienes *${itemKey}* en tu inventario o no pertenece a la tienda.`
                }, { quoted: mensaje })
                return
            }

            const nivelAnterior = Number(invItem[0].nivel_mejora || 0)

            // Verificar nivel máximo para capa_sigilo
            if (itemKey === 'capa_sigilo' && nivelAnterior >= NIVEL_MAXIMO_CAPA) {
                await connection.rollback()
                await sock.sendMessage(jid, {
                    text: `❌ La *Capa de Sigilo* ya está al nivel máximo (*+${NIVEL_MAXIMO_CAPA}*).`
                }, { quoted: mensaje })
                return
            }

            const [gema] = await connection.execute(
                `SELECT item, cantidad FROM inventario_usuario WHERE jid = ? AND item = ? LIMIT 1 FOR UPDATE`,
                [userJid, ITEM_GEMA_MEJORA]
            )

            if (gema.length === 0 || Number(gema[0].cantidad || 0) <= 0) {
                await connection.rollback()
                await sock.sendMessage(jid, {
                    text: '❌ Necesitas una *Gema de Mejora*.\n\n💡 Cómprala en la *.tienda*'
                }, { quoted: mensaje })
                return
            }

            const nombreItem = invItem[0].nombre || itemKey
            const exito = Math.random() < PROBABILIDAD_EXITO

            // Consumir gema
            if (Number(gema[0].cantidad) <= 1) {
                await connection.execute('DELETE FROM inventario_usuario WHERE jid = ? AND item = ?', [userJid, ITEM_GEMA_MEJORA])
            } else {
                await connection.execute('UPDATE inventario_usuario SET cantidad = cantidad - 1 WHERE jid = ? AND item = ?', [userJid, ITEM_GEMA_MEJORA])
            }

            await connection.execute('INSERT INTO historico_items (jid, accion, item) VALUES (?, ?, ?)', [userJid, 'mejorar', itemKey])

            if (exito) {
                await connection.execute(
                    `UPDATE inventario_usuario SET nivel_mejora = COALESCE(nivel_mejora, 0) + 1 WHERE jid = ? AND item = ?`,
                    [userJid, itemKey]
                )
            }

            await connection.commit()
            await registrarCooldown(userJid, 'mejorar', COOLDOWN_MINUTOS)

            if (exito) {
                const nivelNuevo = nivelAnterior + 1

                // Mensaje especial para capa_sigilo
                if (itemKey === 'capa_sigilo') {
                    const cooldownSecs = Math.max(0, 900 - (nivelNuevo * 10)) // 15min - 10s por nivel
                    const cooldownMin = Math.floor(cooldownSecs / 60)
                    const cooldownSec = cooldownSecs % 60
                    const evitacion = 20 + (nivelNuevo * 2)
                    await sock.sendMessage(jid, {
                        text: `⬆️ *MEJORA EXITOSA*\n\n🧥 *Capa de Sigilo* mejorada!\n📈 *Nivel:* +${nivelAnterior} → *+${nivelNuevo}*\n\n🛡️ *Evasión de robo:* ${evitacion}%\n⏳ *Cooldown equipar:* ${cooldownMin}m ${cooldownSec}s\n${nivelNuevo >= NIVEL_MAXIMO_CAPA ? '⭐ *¡NIVEL MÁXIMO ALCANZADO!*' : `🔮 Niveles restantes: ${NIVEL_MAXIMO_CAPA - nivelNuevo}`}\n\n💎 Se consumió 1 *Gema de Mejora*.`
                    }, { quoted: mensaje })
                    return
                }

                await sock.sendMessage(jid, {
                    text: `⬆️ *MEJORA EXITOSA*\n\n✅ *${nombreItem}* mejorado.\n📈 *Nivel:* +${nivelAnterior} → *+${nivelNuevo}*\n\n💎 Se consumió 1 *Gema de Mejora*.`
                }, { quoted: mensaje })
                return
            }

            await sock.sendMessage(jid, {
                text: `❌ *MEJORA FALLIDA*\n\nLa mejora de *${nombreItem}* falló.\n📉 *Nivel actual:* +${nivelAnterior}\n\n💎 Se consumió 1 *Gema de Mejora* de todas formas.`
            }, { quoted: mensaje })

        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }
}

export default mejorar