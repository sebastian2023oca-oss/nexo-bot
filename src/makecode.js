import db from './db.js'
import { esOwner } from './owners.js'

function generarCodigo(nombre) {
    const sufijo = Math.random().toString(36).substring(2, 7).toUpperCase()
    return `NEXO-${nombre.toUpperCase().slice(0, 4)}-${sufijo}`
}

const makecode = {
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const userJid = mensaje.key.participant || mensaje.key.remoteJid

        if (!await esOwner(userJid)) {
            await sock.sendMessage(jid, { text: `🚫 *Solo owners.*` }, { quoted: mensaje })
            return
        }

        if (!args[0] || !args[1] || !args[2]) {
            await sock.sendMessage(jid, {
                text: `❌ Uso correcto: *.makecode <nombre> <cantidad> <usos>*\n\n📌 Ejemplo:\n*.makecode evento500 500 100* → da 500 monedas, 100 usos\n*.makecode penalizacion -200 50* → quita 200 monedas, 50 usos`
            }, { quoted: mensaje })
            return
        }

        const nombre = args[0]
        const cantidad = parseInt(args[1])
        const usos = parseInt(args[2])

        if (isNaN(cantidad) || cantidad === 0) {
            await sock.sendMessage(jid, { text: `❌ La cantidad debe ser un número distinto de 0.` }, { quoted: mensaje })
            return
        }

        if (isNaN(usos) || usos <= 0) {
            await sock.sendMessage(jid, { text: `❌ Los usos deben ser mayor a 0.` }, { quoted: mensaje })
            return
        }

        const codigo = generarCodigo(nombre)

        await db.execute(
            'INSERT INTO codigos_canjeables (codigo, nombre, cantidad, usos_max) VALUES (?, ?, ?, ?)',
            [codigo, nombre, cantidad, usos]
        )

        await sock.sendMessage(jid, {
            text: `🎟️ *CÓDIGO CREADO*\n\n🔑 *Código:* \`${codigo}\`\n📦 *Nombre:* ${nombre}\n💰 *Valor:* ${cantidad > 0 ? '+' : ''}${cantidad} monedas\n🔢 *Usos máximos:* ${usos}\n\n💡 Los usuarios pueden canjear con *.canjear ${codigo}*`
        }, { quoted: mensaje })
    }
}

export default makecode
