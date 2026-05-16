import { reportarErrorComando } from './errorReporter.js'
import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { obtenerConfigMejora } from './mejorasItems.js'

const COOLDOWN_MINUTOS = 20
const PROBABILIDAD_EXITO = 0.7
const ITEM_GEMA_MEJORA = 'gema_mejora'

const mejorar = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, {
                text: '❌ Uso correcto: *.mejorar item\n\nEjemplos:\n*.mejorar pico_reforzado\n*.mejorar caña_premium\n*.mejorar amuleto_suerte\n\n💡 Puedes mejorar objetos de la *.tienda* usando *gema_mejora*.'
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
                text: '❌ No puedes mejorar la *gema_mejora*. Esa gema solo sirve como material de mejora.'
            }, { quoted: mensaje })
            return
        }

        const connection = await db.getConnection()

        try {
            await connection.beginTransaction()

            const [invItem] = await connection.execute(
                `SELECT iu.item, iu.cantidad, COALESCE(iu.nivel_mejora, 0) AS nivel_mejora, t.nombre
                 FROM inventario_usuario iu
                 INNER JOIN tienda t ON t.item = iu.item
                 WHERE iu.jid = ? AND iu.item = ?
                 LIMIT 1
                 FOR UPDATE`,
                [userJid, itemKey]
            )

            if (invItem.length === 0) {
                await connection.rollback()
                await sock.sendMessage(jid, {
                    text: `❌ No puedes mejorar *${itemKey}*.\n\nEse objeto no está en tu inventario o no pertenece a la tienda.\n\n💡 Revisa los códigos disponibles con *.tienda*.`
                }, { quoted: mensaje })
                return
            }

            const [gema] = await connection.execute(
                `SELECT item, cantidad
                 FROM inventario_usuario
                 WHERE jid = ? AND item = ?
                 LIMIT 1
                 FOR UPDATE`,
                [userJid, ITEM_GEMA_MEJORA]
            )

            if (gema.length === 0 || Number(gema[0].cantidad || 0) <= 0) {
                await connection.rollback()
                await sock.sendMessage(jid, {
                    text: '❌ Necesitas una *Gema de Mejora* para mejorar ítems.\n\n💡 Cómprala en la *.tienda*'
                }, { quoted: mensaje })
                return
            }

            const nombreItem = invItem[0].nombre || obtenerConfigMejora(itemKey).nombre || itemKey
            const nivelAnterior = Number(invItem[0].nivel_mejora || 0)
            const exito = Math.random() < PROBABILIDAD_EXITO

            if (Number(gema[0].cantidad) <= 1) {
                await connection.execute(
                    'DELETE FROM inventario_usuario WHERE jid = ? AND item = ?',
                    [userJid, ITEM_GEMA_MEJORA]
                )
            } else {
                await connection.execute(
                    'UPDATE inventario_usuario SET cantidad = cantidad - 1 WHERE jid = ? AND item = ?',
                    [userJid, ITEM_GEMA_MEJORA]
                )
            }

            await connection.execute(
                'INSERT INTO historico_items (jid, accion, item) VALUES (?, ?, ?)',
                [userJid, 'mejorar', itemKey]
            )

            if (exito) {
                await connection.execute(
                    `UPDATE inventario_usuario
                     SET nivel_mejora = COALESCE(nivel_mejora, 0) + 1
                     WHERE jid = ? AND item = ?`,
                    [userJid, itemKey]
                )
            }

            await connection.commit()
            await registrarCooldown(userJid, 'mejorar', COOLDOWN_MINUTOS)

            if (exito) {
                const nivelNuevo = nivelAnterior + 1
                await sock.sendMessage(jid, {
                    text: `⬆️ *MEJORA EXITOSA*\n\n✅ *${nombreItem}* fue mejorado correctamente.\n🔑 Código: *${itemKey}*\n📈 *Nivel anterior:* +${nivelAnterior}\n🚀 *Nuevo nivel:* +${nivelNuevo}\n\n💎 Se consumió 1 *Gema de Mejora*.`
                }, { quoted: mensaje })
                return
            }

            await sock.sendMessage(jid, {
                text: `❌ *MEJORA FALLIDA*\n\nLa mejora de *${nombreItem}* falló esta vez.\n🔑 Código: *${itemKey}*\n📉 *Nivel actual:* +${nivelAnterior}\n\n💎 Se consumió 1 *Gema de Mejora* de todas formas.`
            }, { quoted: mensaje })
        } catch (error) {
            await connection.rollback()
            console.error('Error en comando mejorar:', error)
            
            // Envía la alerta técnica corregida sin usar variables inexistentes
            await reportarErrorComando(sock, {
                comandoTexto: `.mejorar ${itemKey || ''}`, 
                mensaje,
                error
            })

            // Notifica al usuario
            await sock.sendMessage(jid, {
                text: '❌ Ocurrió un error al intentar mejorar el ítem.\n\nEl equipo de owners ya fue avisado automáticamente.'
            }, { quoted: mensaje })
        } finally {
            connection.release()
        }
    }
}

export default mejorar
