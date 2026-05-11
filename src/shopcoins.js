const shopcoins = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        await sock.sendMessage(jid, {
            text: `🏪 *TIENDA DE MONEDAS*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚡ *BOOSTS*\n\n  ✦ *.comprar doble_xp* → Doble XP 1h\n     💰 *1000 monedas*\n\n  ✦ *.comprar doble_work* → Doble ganancia en .work 1h\n     💰 *800 monedas*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎁 *ITEMS*\n\n  ✦ *.comprar caja* → Caja misteriosa\n     💰 *300 monedas*\n\n  ✦ *.comprar escudo* → Escudo anti-robo (duración aleatoria)\n     💰 *5000 monedas*\n\n  ✦ *.comprar pocion* → Poción de suerte 5h\n     💰 *600 monedas*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🏦 *FINANCIERO*\n\n  ✦ *.comprar ampliar_prestamo* → Límite préstamo x2\n     💰 *1500 monedas*\n\n  ✦ *.comprar reducir_interes* → Interés préstamo -10%\n     💰 *1000 monedas*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n👤 *PERFIL*\n\n  ✦ *.comprar marco* → Marco especial en perfil\n     💰 *400 monedas*\n\n  ✦ *.comprar insignia* → Insignia exclusiva\n     💰 *700 monedas*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🏠 *BODEGA*\n\n  ✦ *.comprar ampliar_bodega* → +25 espacios en bodega\n     💰 *5000 monedas*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        }, { quoted: mensaje })
    }
}

export default shopcoins