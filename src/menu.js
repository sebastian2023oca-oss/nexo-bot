import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import menu1 from './menu1.js'
import menu2 from './menu2.js'
import menu3 from './menu3.js'
import menu4 from './menu4.js'
import menu5 from './menu5.js'
import menu19 from './menu19.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const imagen = () => readFileSync(join(__dirname, '../assets/menu.jpg'))

const submenus = { 1: menu1, 2: menu2, 3: menu3, 4: menu4, 5: menu5, 19: menu19 }

const menuTexto = `╔════════════════════════════════╗
║      ✦  N E X O  B O T  ✦      ║
║         Menú Principal         ║
╚════════════════════════════════╝

▸ 24 páginas  ·  140+ comandos
▸ Prefijo: .  ·  Versión: 1.60.5

👑  LINK DEL CANAL OFICIAL

➪  https://tinyurl.com/Nexo-Bot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋  CATEGORÍAS DISPONIBLES

  ┌─ pág 01 ─┐  👤 𝗣𝗘ℝ𝗙𝕀𝗟 & ℝ𝗘𝔾𝕀𝕊𝕋ℝ𝗢
  ├─ pág 02 ─┤  💰 𝗘𝗖𝗢ℕ𝗢𝗠𝕀́𝗔
  ├─ pág 03 ─┤  🛒 𝕋𝕀𝗘ℕ𝗗𝗔 & 𝕀ℕ𝗩𝗘ℕ𝕋𝗔ℝ𝕀𝗢
  ├─ pág 04 ─┤  🎮 𝗝𝗨𝗘𝗚𝗢𝕊
  ├─ pág 05 ─┤  🎯 𝗔𝗣𝗨𝗘𝕊𝕋𝗔𝕊
  ├─ pág 06 ─┤  🤖 𝕀ℕ𝕋𝗘𝗟𝕀𝗚𝗘ℕ𝗖𝕀𝗔 𝗔ℝ𝕋𝕀𝗙𝕀𝗖𝕀𝗔𝗟
  ├─ pág 07 ─┤  🎵 𝗠𝗨𝗟𝕋𝕀𝗠𝗘𝗗𝕀𝗔 & 𝗗𝗘𝕊𝗖𝗔ℝ𝗚𝗔𝕊
  ├─ pág 08 ─┤  🖼️  𝕊𝕋𝕀𝗖𝗞𝗘ℝ𝕊 & 𝕀𝗠𝗔𝗚𝗘ℕ𝗘𝕊
  ├─ pág 09 ─┤  🔍 𝗕𝗨́𝕊𝗤𝗨𝗘𝗗𝗔𝕊 & 𝗖𝗢ℕ𝕊𝗨𝗟𝕋𝗔𝕊
  ├─ pág 10 ─┤  🧮 𝗨𝕋𝕀𝗟𝕀𝗗𝗔𝗗𝗘𝕊
  ├─ pág 11 ─┤  📅 𝗣ℝ𝗢𝗗𝗨𝗖𝕋𝕀𝗩𝕀𝗗𝗔𝗗
  ├─ pág 12 ─┤  👮 𝗠𝗢𝗗𝗘ℝ𝗔𝗖𝕀𝗢́ℕ
  ├─ pág 13 ─┤  ⚙️  𝗖𝗢ℕ𝗙𝕀𝗚. 𝗚ℝ𝗨𝗣𝗢𝕊
  ├─ pág 14 ─┤  🔒 𝕊𝗘𝗚𝗨ℝ𝕀𝗗𝗔𝗗 & 𝗔ℕ𝕋𝕀𝕊𝗣𝗔𝗠
  ├─ pág 15 ─┤  📊 𝗘𝕊𝕋𝗔𝗗𝕀́𝕊𝕋𝕀𝗖𝗔𝕊
  ├─ pág 16 ─┤  🎉 𝕊𝗢𝗖𝕀𝗔𝗟 & 𝗖𝗢𝗠𝗨ℕ𝕀𝗗𝗔𝗗
  ├─ pág 17 ─┤  📣 𝗔ℕ𝗨ℕ𝗖𝕀𝗢𝕊 & 𝗗𝕀𝗙𝗨𝕊𝕀𝗢́ℕ
  ├─ pág 18 ─┤  ℹ️  𝕀ℕ𝗙𝗢 𝗗𝗘𝗟 𝗕𝗢𝕋
  ├─ pág 19 ─┤  🛡️  𝗔𝗗𝗠𝕀ℕ 𝗗𝗘𝗟 𝗕𝗢𝕋 (OWNERS)
  ├─ pág 20 ─┤  🏢 ℕ𝗘𝗚𝗢𝗖𝕀𝗢𝕊 💼
  ├─ pág 21 ─┤  👥 𝗕𝗢𝕋 𝗗𝗘 𝗚ℝ𝗨𝗣𝗢
  ├─ pág 22 ─┤  🌸 𝗚𝕀𝗙𝕊 & 𝗔𝗖𝗖𝕀𝗢ℕ𝗘𝕊 ✨
  ├─ pág 23 ─┤  👑 𝕍𝕀𝗣
  └─ pág 24 ─┘  🔞 +𝟭𝟴

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧭  NAVEGACIÓN

  ✦ .menu <n>    → ir a una página
  ✦ .menu 1      → ver Perfil
  ✦ .menu 2      → ver Economía
  ✦ .menu 3      → ver Tienda & Inventario
  ✦ .menu 4      → ver Juegos
  ✦ .menu 19     → ver Panel Owners

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡  COMANDOS RÁPIDOS

  ➪ .rules       → reglas del bot
  ➪ .addbot      → añadir a tu grupo
  ➪ .saludo      → saludar al bot
  ➪ .chiste      → contar un chiste
  ➪ .canjear     → canjear un código
  ➪ .buyvip      → membresía VIP
  ➪ .buynegocio  → plan Negocios
  
╚══════════════════════════════╝`

const menu = {
    nombre: 'menu',
    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid

        if (!args[0]) {
            await sock.sendMessage(jid, { image: imagen(), caption: menuTexto }, { quoted: mensaje })
            return
        }

        const pagina = parseInt(args[0])

        if (isNaN(pagina) || pagina < 1 || pagina > 24) {
            await sock.sendMessage(jid, { text: `❌ Página inválida. Usa un número del *1* al *24*.` }, { quoted: mensaje })
            return
        }

        if (submenus[pagina]) {
            await submenus[pagina].ejecutar(sock, mensaje, args)
            return
        }

        await sock.sendMessage(jid, { text: `🚧 La página *${pagina}* aún está en construcción.\n\nEscribe *.menu* para ver todas las categorías.` }, { quoted: mensaje })
    }
}

export default menu