const menu1 = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        await sock.sendMessage(jid, {
            text: `╔════════════════════════════════╗
║      👤 PERFIL & REGISTRO      ║
╚════════════════════════════════╝

▸ Página 1 de 24
▸ Sistema: Estructura bloqueada
▸ Prefijo: .

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 *IDENTIDAD DEL USUARIO*

  ✦ *.perfil* → ficha completa del usuario
  ✦ *.perfil @usuario* → ver perfil de otro
  ✦ *.avatar* → imagen de perfil
  ✦ *.id* → identificador único

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *PROGRESO & ESTADÍSTICAS*

  ✦ *.nivel* → nivel actual y progreso
  ✦ *.xp* → experiencia acumulada
  ✦ *.stats* → resumen de actividad
  ✦ *.insignias* → logros obtenidos
  ✦ *.rank* → posición en el ranking
  ✦ *.top* → usuarios más activos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 *CONFIGURACIÓN DE PERFIL*

  ✦ *.setbio <texto>* → cambiar biografía
  ✦ *.setstatus <estado>* → cambiar estado
  ✦ *.setname <nombre>* → cambiar nombre
  ✦ *.resetperfil* → reiniciar perfil

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧭 *CONTROL SOCIAL*

  ✦ *.reputacion* → ver reputación
  ✦ *.followers* → ver seguidores
  ✦ *.follow @usuario* → seguir usuario
  ✦ *.block @usuario* → bloquear usuario

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Esta página representa la identidad
base del usuario dentro del bot.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧭 *NAVEGACIÓN*

  ✦ *.menu* → menú principal
  ✦ *.menu 2* → economía
  ✦ *.menu 3* → tienda & inventario
  ✦ *.menu 7* → multimedia

╚══════════════════════════════╝`
        }, { quoted: mensaje })
    }
}

export default menu1