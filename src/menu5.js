const menu5 = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        await sock.sendMessage(jid, {
            text: `╔════════════════════════════════╗
║      🎰 APUESTAS & CASINO      ║
╚════════════════════════════════╝

▸ Página 5 de 24
▸ Sistema: Economía y Riesgo
▸ Prefijo: .

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎲 *APUESTAS CLÁSICAS*

  ✦ *.apostar <cantidad>* → apuesta contra Nexo-Bot
  ✦ *.coinflip <cantidad>* → cara o cruz
  ✦ *.ruleta <rojo/negro> <cantidad>* → gira la ruleta
  ✦ *.slots <cantidad>* → tragamonedas
  ✦ *.blackjack <cantidad>* → blackjack contra el casino
  ✦ *.loteria* → juega a la lotería
  ✦ *.dado* → lanza un dado
  ✦ *.suerte* → evento completamente aleatorio
  ✦ *.luck* → ¿ganarás o perderás?
  ✦ *.ppt piedra/papel/tijera* → piedra, papel o tijera

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚔️ *APUESTAS ENTRE USUARIOS*

  ✦ *.retar @usuario <cantidad>* → envía una apuesta directa
  ✦ *.aceptarreto* → acepta una apuesta pendiente
  ✦ *.cancelarreto* → cancela un reto enviado
  ✦ *.coinflipvs @usuario <cantidad>* → cara o cruz PvP
  ✦ *.blackjackvs @usuario <cantidad>* → blackjack PvP
  ✦ *.ruletavs @usuario <cantidad>* → ruleta PvP
  ✦ *.allin @usuario* → ambos arriesgan todo su dinero
  ✦ *.subasta <cantidad>* → guerra de apuestas, gana el mayor postor
  ✦ *.dueloapuesta @usuario <cantidad>* → duelo de suerte por monedas
  ✦ *.venganza @usuario <cantidad>* → revancha contra quien te ganó
  ✦ *.duelo @usuario* → combate simbólico

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🍀 *SUERTE Y RIESGO*

  ✦ *.jackpot <cantidad>* → participa en el Jackpot global
  ✦ *.raspaygana <cantidad>* → raspa una tarjeta virtual
  ✦ *.caja <cantidad>* → abre una caja misteriosa
  ✦ *.doblenada <cantidad>* → duplica o pierde todo
  ✦ *.escalera <cantidad>* → multiplica tu premio ronda tras ronda
  ✦ *.tesoro <cantidad>* → elige un cofre y descubre tu destino
  ✦ *.misterio <cantidad>* → evento totalmente aleatorio
  ✦ *.sobrevive <cantidad>* → sobrevive varias rondas para ganar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 *COMPETITIVO*

  ✦ *.rankingcasino* → ranking general del casino
  ✦ *.topapostadores* → quiénes más han apostado
  ✦ *.topganadores* → quiénes más han ganado
  ✦ *.topperdedores* → quiénes más han perdido
  ✦ *.racha* → consulta tu racha actual
  ✦ *.estadisticascasino* → estadísticas completas de apuestas
  ✦ *.historialapuestas* → historial reciente de apuestas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👑 *EVENTOS ESPECIALES*

  ✦ *.apostagrupal <cantidad>* → todos apuestan, solo uno gana
  ✦ *.guerra <cantidad>* → Battle Royale de apuestas
  ✦ *.torneo* → torneo eliminatorio por premios
  ✦ *.reycasino* → intenta derrotar al Rey del Casino
  ✦ *.pozomundial* → pozo acumulativo entre todos los grupos
  ✦ *.ultimohombre <cantidad>* → eliminación masiva hasta un ganador
  ✦ *.caceria @usuario <cantidad>* → coloca recompensa sobre un jugador

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧭 *NAVEGACIÓN*

  ✦ *.menu* → menú principal
  ✦ *.menu 2* → economía
  ✦ *.menu 4* → juegos

╚══════════════════════════════╝`
        }, { quoted: mensaje })
    }
}

export default menu5
