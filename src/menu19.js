const menu19 = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid

        const texto = `╔══════════════════════════╗
║   👑 MENÚ OWNERS — #19   ║
╚══════════════════════════╝

🔐 *Comandos exclusivos de Owners*
> Si no eres owner, los comandos no funcionarán.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *USUARIOS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ *.addowner @usuario*
  › Añade un nuevo Owner

✦ *.delowner @usuario*
  › Elimina a un Owner

✦ *.banuser @usuario <motivo>*
  › Banea al usuario del bot

✦ *.unbanuser @usuario*
  › Desbanea al usuario

✦ *.mute @usuario*
  › Silencia al usuario (bot ignora sus msgs)

✦ *.unmute @usuario*
  › Desmutealo

✦ *.coronar @usuario*
  › Da rol de admin en el grupo

✦ *.demoteall*
  › Quita admin a todos en el grupo

✦ *.nuke*
  › Expulsa a todos los usuarios del grupo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 *VIP & NEGOCIO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ *.addvip <horas> @usuario*
  › Da VIP Normal al usuario

✦ *.addvip-ultra <horas> @usuario*
  › Da VIP Ultra al usuario

✦ *.addnegocio <horas> @usuario*
  › Da Negocio Normal al usuario

✦ *.addnegocio-ultra <horas> @usuario*
  › Da Negocio Ultra al usuario

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *RECURSOS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ *.add <recurso> <cantidad> @usuario*
  › Añade recursos al usuario
  › Recursos: monedas, banco, xp, nivel

✦ *.penalizar <recurso> <cantidad> @usuario*
  › Resta recursos al usuario

✦ *.drop <objeto> <cantidad>*
  › Regala un ítem a TODOS los usuarios

✦ *.eventocm*
  › Evento personalizado para todos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛒 *TIENDA*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ *.addstock <cantidad> <objeto>*
  › Añade stock a un objeto

✦ *.resetstock*
  › Reinicia todo el stock de la tienda

✦ *.adjustprices <objeto> <precio>*
  › Ajusta el precio de un objeto

✦ *.ordenartienda*
  › Ordena los objetos por precio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 *BOT*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ *.aviso <mensaje>*
  › Envía aviso global a todos los grupos

✦ *.reunion <mensaje>*
  › Reúne a todos los owners

✦ *.reply <ID> <respuesta>*
  › Responde a sugerencia/reporte de usuario

✦ *.backup*
  › Genera backup de la base de datos

✦ *.pandabotlogs*
  › Muestra los últimos logs del bot

✦ *.getcommand <comando>*
  › Ver el código de un plugin

✦ *.reiniciar*
  › Reinicia el bot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎟️ *CÓDIGOS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ *.makecode <nombre> <cantidad> <usos>*
  › Crea un código canjeable
  › Cantidad negativa = quita monedas

✦ *.viewcodes*
  › Ver todos los códigos activos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
😈 *DIVERSIÓN OWNER*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ *.defecar @usuario*
  › 💩 Le defecas encima

✦ *.violar @usuario*
  › 😈 Acción especial al usuario

╚══════════════════════════╝`

        await sock.sendMessage(jid, { text: texto }, { quoted: mensaje })
    }
}

export default menu19
