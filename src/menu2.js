const menu2 = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        await sock.sendMessage(jid, {
            text: `╔════════════════════════════════╗
║          💰 ECONOMÍA           ║
╚════════════════════════════════╝

▸ Página 2 de 24
▸ Sistema: Estructura bloqueada
▸ Prefijo: .

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 *DINERO & SALDOS*

  ✦ *.balance* → dinero en mano
  ✦ *.banco* → dinero en el banco
  ✦ *.saldo* → resumen total

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💼 *TRABAJO & INGRESOS*

  ✦ *.work* → trabajar y ganar monedas
  ✦ *.daily* → recompensa diaria
  ✦ *.interes* → ganancias del banco

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 *TRANSACCIONES*

  ✦ *.transferir @usuario <cantidad>*
  ✦ *.pagar @usuario <cantidad>*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 *SISTEMA FINANCIERO*

  ✦ *.invertir <cantidad>* → invertir
  ✦ *.rentabilidad* → ver inversiones
  ✦ *.prestamo <cantidad>* → pedir préstamo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎲 *CASINO & AZAR*

  ✦ *.loteria* → participar en lotería
  ✦ *.ruleta* → juego de azar
  ✦ *.robar @usuario* → intentar robar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏪 *TIENDA ECONÓMICA*

  ✦ *.shopcoins* → tienda de monedas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧭 *NAVEGACIÓN*

  ✦ *.menu* → menú principal
  ✦ *.menu 1* → perfil
  ✦ *.menu 3* → tienda & inventario
  ✦ *.menu 7* → multimedia

╚══════════════════════════════╝`
        }, { quoted: mensaje })
    }
}

export default menu2
