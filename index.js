import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import { toDataURL } from 'qrcode'
import http from 'http'
import { manejarMensaje } from './handler.js'

const logger = pino({ level: 'silent' })
let qrActual = null
let sockActual = null
let reconectando = false

const servidor = http.createServer(async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })

    if (!qrActual) {
        res.end(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="3">
    <title>QR - WhatsApp Bot</title>
    <style>
      body { display:flex; flex-direction:column; align-items:center; justify-content:center;
             height:100vh; margin:0; background:#111; color:#fff; font-family:sans-serif; }
    </style>
  </head>
  <body>
    <p>Generando QR, espera un momento...</p>
    <small style="opacity:.5">Esta pagina se actualiza sola.</small>
  </body>
</html>`)
        return
    }

    const imgSrc = await toDataURL(qrActual, { width: 300 })
    res.end(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>QR - WhatsApp Bot</title>
    <style>
      body { display:flex; flex-direction:column; align-items:center; justify-content:center;
             height:100vh; margin:0; background:#111; color:#fff; font-family:sans-serif; }
      img { width:300px; height:300px; border:12px solid white; border-radius:12px; }
      p { margin-top:20px; font-size:18px; }
      small { opacity:.5; margin-top:8px; }
    </style>
  </head>
  <body>
    <img src="${imgSrc}" />
    <p>Escanea con WhatsApp - Dispositivos vinculados</p>
    <small>Cuando te conectes puedes cerrar esta pagina.</small>
  </body>
</html>`)
})

servidor.listen(4000, () => {
    console.log('\nServidor QR iniciado.')
    console.log('   Abre tu navegador y entra a:  http://localhost:4000\n')
})

async function iniciarBot() {
    if (sockActual) {
        try { sockActual.end() } catch {}
        sockActual = null
    }

    reconectando = false

    const { state, saveCreds } = await useMultiFileAuthState('./sesion')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: false,
        browser: ['Mi Bot', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        retryRequestDelayMs: 2000,
        syncFullHistory: false,
    })

    sockActual = sock
    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            qrActual = qr
            console.log('QR listo. Abre  http://localhost:4000  en tu navegador.')
        }

        if (connection === 'close') {
            const codigo = new Boom(lastDisconnect?.error)?.output?.statusCode

            if (codigo === DisconnectReason.loggedOut) {
                console.log('Sesion cerrada manualmente desde el celular.')
                console.log('Borra la carpeta sesion y vuelve a escanear el QR.')
                try { servidor.close() } catch {}
                return
            }

            if (reconectando) return
            reconectando = true

            const motivo = lastDisconnect?.error?.message || 'desconocido'
            console.log(`Reconectando en 5 segundos... (motivo: ${motivo})`)
            setTimeout(() => iniciarBot(), 5000)
        }

        if (connection === 'open') {
            qrActual = null
            reconectando = false
            console.log('Bot conectado correctamente a WhatsApp')
            try { servidor.close() } catch {}
        }
    })

    // Esperar a que los chats estén listos antes de procesar mensajes
    sock.ev.on('messaging-history.set', () => {
        console.log('✅ Chats sincronizados, bot listo.')
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return

        for (const mensaje of messages) {
            if (!mensaje.key.fromMe) {
                try {
                    await manejarMensaje(sock, mensaje)
                } catch (err) {
                    console.log('Mensaje ignorado por error de cifrado')
                }
            }
        }
    })
}

iniciarBot()