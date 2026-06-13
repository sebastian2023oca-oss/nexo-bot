const menu2 = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        await sock.sendMessage(jid, {
            text: `╔════════════════════════════════╗
║          💰 ECONOMÍA           ║
╚════════════════════════════════╝

▸ Página 2 de 24
▸ Sistema: Economía Dinámica
▸ Prefijo: .

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 *DINERO & SALDOS*

  ✦ *.balance* → dinero en mano
  ✦ *.banco* → dinero en el banco
  ✦ *.saldo* → resumen total
  ✦ *.depositar <cantidad>* → guardar en banco
  ✦ *.retirar <cantidad>* → sacar del banco

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💼 *TRABAJO & INGRESOS*

  ✦ *.work* → trabajar y ganar monedas
  ✦ *.daily* → recompensa diaria
  ✦ *.interes* → ganancias del banco
  ✦ *.minar* → minería digital
  ✦ *.pescar* → sistema de pesca
  ✦ *.cazar* → caza de recompensas
  ✦ *.recolectar* → buscar objetos valiosos
  ✦ *.negocio* → negocio virtual
  ✦ *.repartir* → entregas rápidas
  ✦ *.beg* → pedir monedas al sistema
  ✦ *.expedicion* → explorar lugares (2h cooldown)
  ✦ *.aventura* → aventuras de combate (3h cooldown)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 *TRANSACCIONES*

  ✦ *.transferir @usuario <cantidad>*
  ✦ *.pagar @usuario <cantidad>*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 *SISTEMA FINANCIERO*

  ✦ *.invertir <cantidad>* → invertir
  ✦ *.rentabilidad* → ver inversiones
  ✦ *.prestamo <cantidad>* → préstamo del sistema
  ✦ *.prestamo @usuario <cantidad>* → pedir a usuario
  ✦ *.pagar_prestamo <cantidad>* → pagar préstamo
  ✦ *.deuda* → ver deudas activas
  ✦ *.apostar <cantidad>* → apuesta de alto riesgo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎲 *CASINO & AZAR*

  ✦ *.loteria* → sorteo aleatorio
  ✦ *.ruleta* → juego de azar
  ✦ *.robar @usuario* → intentar robar monedas
  ✦ *.robar_item @usuario* → intentar robar ítem
  ✦ *.coinflip <cantidad>* → cara o sello
  ✦ *.slots* → tragamonedas
  ✦ *.blackjack* → blackjack contra el sistema
  ✦ *.hack @usuario* → intentar hackear banco de usuario

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏪 *TIENDA ECONÓMICA*

  ✦ *.shopcoins* → tienda de monedas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏦 *RANKINGS FINANCIEROS*

  ✦ *.topbank* → ranking del banco
  ✦ *.topmoney* → ranking de riqueza total

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