import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import { registrarJugadaCasino } from './casinoUtils.js'

const caja = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { text: `❌ Uso correcto: *.caja <cantidad>*` }, { quoted: mensaje })
            return
        }

        const cantidad = parseInt(args[0])
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número mayor a 0.` }, { quoted: mensaje })
            return
        }

        const enCooldown = await verificarCooldown(userJid, 'caja', 10)
        if (enCooldown) {
            await sock.sendMessage(jid, { text: `⏳ Debes esperar *${enCooldown} minutos* para abrir otra caja.` }, { quoted: mensaje })
            return
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE jid = ?', [userJid])
        if (rows.length === 0) {
            await sock.sendMessage(jid, { text: `❌ No estás registrado en el bot.` }, { quoted: mensaje })
            return
        }

        if ((rows[0].monedas || 0) < cantidad) {
            await sock.sendMessage(jid, { text: `❌ No tienes suficiente dinero.\n\n💵 *Tu balance:* ${rows[0].monedas || 0} monedas` }, { quoted: mensaje })
            return
        }

        // 30% de probabilidad de ganancia neta positiva (multiplicador > 1),
        // 70% de pérdida (multiplicador < 1, incluyendo la caja vacía).
        let multiplicador
        if (Math.random() < 0.3) {
            const multiplicadoresGanadores = [1.5, 2, 3, 5]
            const pesosGanadores =          [45, 35, 15, 5]
            const total = pesosGanadores.reduce((a, b) => a + b, 0)
            let rand = Math.random() * total
            multiplicador = multiplicadoresGanadores[multiplicadoresGanadores.length - 1]
            for (let i = 0; i < pesosGanadores.length; i++) {
                if (rand < pesosGanadores[i]) { multiplicador = multiplicadoresGanadores[i]; break }
                rand -= pesosGanadores[i]
            }
        } else {
            const multiplicadoresPerdedores = [0, 0.3, 0.5, 0.8]
            const pesosPerdedores =           [35, 30, 25, 10]
            const total = pesosPerdedores.reduce((a, b) => a + b, 0)
            let rand = Math.random() * total
            multiplicador = multiplicadoresPerdedores[multiplicadoresPerdedores.length - 1]
            for (let i = 0; i < pesosPerdedores.length; i++) {
                if (rand < pesosPerdedores[i]) { multiplicador = multiplicadoresPerdedores[i]; break }
                rand -= pesosPerdedores[i]
            }
        }

        const premio = Math.floor(cantidad * multiplicador)
        const ganancia = premio - cantidad

        await db.execute('UPDATE usuarios SET monedas = monedas - ? + ? WHERE jid = ?', [cantidad, premio, userJid])
        await registrarCooldown(userJid, 'caja', 10)

        const resultado = ganancia > 0 ? 'gano' : ganancia < 0 ? 'perdio' : 'empate'
        await registrarJugadaCasino(userJid, 'caja', cantidad, resultado, ganancia)

        let emoji = '📦'
        let textoResultado = ''
        if (multiplicador === 0) textoResultado = '💀 *¡Caja vacía! Lo perdiste todo.*'
        else if (multiplicador < 1) textoResultado = `😕 *Caja pobre.* Recuperaste solo una parte.`
        else if (multiplicador === 1) textoResultado = `😐 *Empate.* Recuperaste tu apuesta.`
        else if (multiplicador <= 2) textoResultado = `✅ *¡Buena caja!* Multiplicador x${multiplicador}`
        else { emoji = '🎉'; textoResultado = `🤑 *¡CAJA LEGENDARIA!* Multiplicador x${multiplicador}` }

        await sock.sendMessage(jid, {
            text: `${emoji} *CAJA MISTERIOSA*\n\n${textoResultado}\n\n💰 *Apostado:* ${cantidad} monedas\n🎁 *Obtenido:* ${premio} monedas\n${ganancia >= 0 ? '📈' : '📉'} *Resultado:* ${ganancia >= 0 ? '+' : ''}${ganancia} monedas\n\n💵 *Balance actual:* ${(rows[0].monedas || 0) - cantidad + premio} monedas`
        }, { quoted: mensaje })
    }
}

export default caja