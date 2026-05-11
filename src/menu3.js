const menu3 = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        await sock.sendMessage(jid, {
            text: `╔════════════════════════════════╗
║     🛒 TIENDA & INVENTARIO     ║
╚════════════════════════════════╝

▸ Página 3 de 24
▸ Sistema: Estructura bloqueada
▸ Prefijo: .

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏪 *TIENDA GENERAL*

  ✦ *.tienda* → catálogo completo
  ✦ *.comprar <item>* → comprar objeto
  ✦ *.precio <item>* → consultar precio actual
  ✦ *.stock <item>* → ver disponibilidad

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎒 *INVENTARIO*

  ✦ *.inventario* → ver tus objetos
  ✦ *.listar* → inventario detallado
  ✦ *.usar <item>* → activar objeto
  ✦ *.equipar <item>* → equipar objeto
  ✦ *.desequipar <item>* → desequipar objeto

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 *COMERCIO ENTRE USUARIOS*

  ✦ *.vender <item>* → vender objeto
  ✦ *.regalar <item> @usuario* → regalar objeto

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ *GESTIÓN DE OBJETOS*

  ✦ *.mejorar <item>* → mejorar objeto
  ✦ *.bodega* → ver tu bodega
  ✦ *.almacenar <item>* → guardar en bodega
  ✦ *.sacar <item>* → sacar de bodega
  ✦ *.historico* → registro de movimientos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧭 *NAVEGACIÓN*

  ✦ *.menu* → menú principal
  ✦ *.menu 2* → economía
  ✦ *.menu 4* → juegos
  ✦ *.menu 7* → multimedia

╚══════════════════════════════╝`
        }, { quoted: mensaje })
    }
}

export default menu3
