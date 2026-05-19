const menu4 = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        await sock.sendMessage(jid, {
            text: `╔════════════════════════════════╗
║          🎮 JUEGOS             ║
╚════════════════════════════════╝

▸ Página 4 de 24
▸ Sistema: Estructura bloqueada
▸ Prefijo: .

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎲 *JUEGOS CLÁSICOS*

  ✦ *.trivia* → preguntas de conocimiento
  ✦ *.adivina* → adivina la palabra oculta
  ✦ *.hangman* → el ahorcado clásico
  ✦ *.quiz* → cuestionario de opción múltiple
  ✦ *.mathgame* → retos matemáticos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 *JUEGOS DE AZAR*

  ✦ *.dado* → lanza un dado
  ✦ *.suerte* → evento completamente aleatorio
  ✦ *.luck* → ¿ganarás o perderás?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚔️ *JUEGOS COMPETITIVOS*

  ✦ *.ppt @usuario* → piedra, papel o tijera
  ✦ *.duelo @usuario* → combate simbólico
  ✦ *.speedtype* → velocidad de escritura

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 *JUEGOS DE LÓGICA*

  ✦ *.adivinanumero* → adivina el número
  ✦ *.riddle* → adivinanzas lógicas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 *INSIGNIAS DE JUEGOS*

  ✦ 🥉 *Easy* → 10 victorias → 1,000 💰
  ✦ 🥈 *Medium* → 100 victorias → 10,000 💰
  ✦ 🥇 *Hard* → 1,000 victorias → 100,000 💰

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *SISTEMA DE PROGRESO*

  ▸ Los juegos otorgan XP y pocas monedas
  ▸ 2.5% de probabilidad de ganar ⭐ reputación
  ▸ Insignias por victorias acumuladas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧭 *NAVEGACIÓN*

  ✦ *.menu* → menú principal
  ✦ *.menu 3* → tienda & inventario
  ✦ *.menu 5* → apuestas
  ✦ *.menu 7* → multimedia

╚══════════════════════════════╝`
        }, { quoted: mensaje })
    }
}

export default menu4
