const menu19 = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        await sock.sendMessage(jid, {
            text: `╔════════════════════════════════╗
║       🛡️ PANEL DE OWNERS       ║
╚════════════════════════════════╝

▸ Página 19 de 24
▸ Sistema: Solo Owners
▸ Prefijo: .

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 *GESTIÓN DE USUARIOS*

  ✦ *.add <recurso> <cantidad> @u* → dar recurso
  ✦ *.penalizar <recurso> <cant> @u* → quitar recurso
  ✦ *.banuser @usuario <motivo>* → banear usuario
  ✦ *.unbanuser @usuario* → desbanear usuario
  ✦ *.mute @usuario* → mutear usuario
  ✦ *.unmute @usuario* → desmutear usuario

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👑 *GESTIÓN DE OWNERS*

  ✦ *.addowner @usuario* → añadir owner
  ✦ *.delowner @usuario* → eliminar owner

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💎 *VIP & NEGOCIOS*

  ✦ *.addvip <horas> @usuario* → dar VIP normal
  ✦ *.addvip-ultra <horas> @usuario* → dar VIP ultra
  ✦ *.addnegocio <horas> @usuario* → dar Negocio normal
  ✦ *.addnegocio-ultra <horas> @usuario* → dar Negocio ultra

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏪 *GESTIÓN DE TIENDA*

  ✦ *.addstock <cantidad> <item>* → añadir stock
  ✦ *.resetstock* → reiniciar todos los stocks
  ✦ *.adjustprices <item> <precio>* → ajustar precio
  ✦ *.ordenartienda* → ordenar por precio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 *EVENTOS*

  ✦ *.drop <item> <cantidad>* → regalar a todos
  ✦ *.eventocm* → evento personalizado
  ✦ *.aviso <mensaje>* → aviso global
  ✦ *.reunion <mensaje>* → reunir owners

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎟️ *CÓDIGOS CANJEABLES*

  ✦ *.makecode <nombre> <cant> <usos>* → crear código
  ✦ *.viewcodes* → ver códigos activos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ *ADMINISTRACIÓN DEL BOT*

  ✦ *.backup* → backup de BD
  ✦ *.reiniciar* → reiniciar bot
  ✦ *.pandabotlogs* → ver consola
  ✦ *.getcommand <comando>* → ver código

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 *GRUPO*

  ✦ *.coronar @usuario* → dar admin
  ✦ *.demoteall* → quitar admins
  ✦ *.nuke* → expulsar todos
  ✦ *.reply <ID> <respuesta>* → responder sugerencia

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

😈 *DIVERSIÓN*

  ✦ *.defecar @usuario* → 💩
  ✦ *.violar @usuario* → 👀

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧭 *NAVEGACIÓN*

  ✦ *.menu* → menú principal
  ✦ *.menu 1* → perfil
  ✦ *.menu 2* → economía

╚══════════════════════════════╝`
        }, { quoted: mensaje })
    }
}

export default menu19
