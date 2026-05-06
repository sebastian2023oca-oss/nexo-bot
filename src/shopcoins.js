const shopcoins = {
    async ejecutar(sock, mensaje) {
        const jid = mensaje.key.remoteJid

        await sock.sendMessage(jid, {
            text: `🏪 *TIENDA DE MONEDAS*\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🚧 La tienda está en construcción.\n\nPronto podrás canjear monedas por beneficios especiales.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        }, { quoted: mensaje })
    }
}

export default shopcoins
