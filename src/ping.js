const ping = {
    async ejecutar(sock, mensaje) {
        const inicio = Date.now();
        const jid = mensaje.key.remoteJid;

        await sock.sendMessage(jid, { text: '...' });

        const tiempo = Date.now() - inicio;

        await sock.sendMessage(jid, {
            text: `🏓 *¡Pong!* El bot está activo.\n\n⚡ Tiempo de reacción: *${tiempo}ms*`
        });
    }
};

export default ping;