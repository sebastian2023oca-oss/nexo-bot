import db from './db.js'
import { verificarCooldown, registrarCooldown } from './utils.js'
import {
    intentarDarEstrella,
    registrarVictoria,
    darRecompensaJuego
} from './juegosUtils.js'

const paises = [

    { bandera:'🇦🇷', nombre:'argentina' },
    { bandera:'🇨🇴', nombre:'colombia' },
    { bandera:'🇲🇽', nombre:'mexico' },
    { bandera:'🇧🇷', nombre:'brasil' },
    { bandera:'🇨🇱', nombre:'chile' },
    { bandera:'🇵🇪', nombre:'peru' },
    { bandera:'🇺🇾', nombre:'uruguay' },
    { bandera:'🇵🇾', nombre:'paraguay' },
    { bandera:'🇻🇪', nombre:'venezuela' },
    { bandera:'🇪🇨', nombre:'ecuador' },
    { bandera:'🇧🇴', nombre:'bolivia' },
    { bandera:'🇺🇸', nombre:'estados unidos' },
    { bandera:'🇨🇦', nombre:'canada' },
    { bandera:'🇪🇸', nombre:'españa' },
    { bandera:'🇫🇷', nombre:'francia' },
    { bandera:'🇩🇪', nombre:'alemania' },
    { bandera:'🇮🇹', nombre:'italia' },
    { bandera:'🇵🇹', nombre:'portugal' },
    { bandera:'🇯🇵', nombre:'japon' },
    { bandera:'🇨🇳', nombre:'china' },
    { bandera:'🇰🇷', nombre:'corea del sur' },
    { bandera:'🇰🇵', nombre:'corea del norte' },
    { bandera:'🇷🇺', nombre:'rusia' },
    { bandera:'🇮🇳', nombre:'india' },
    { bandera:'🇦🇺', nombre:'australia' },
    { bandera:'🇬🇧', nombre:'reino unido' },
    { bandera:'🇸🇪', nombre:'suecia' },
    { bandera:'🇳🇴', nombre:'noruega' },
    { bandera:'🇫🇮', nombre:'finlandia' },
    { bandera:'🇩🇰', nombre:'dinamarca' },
    { bandera:'🇳🇱', nombre:'paises bajos' },
    { bandera:'🇨🇭', nombre:'suiza' },
    { bandera:'🇹🇷', nombre:'turquia' },
    { bandera:'🇪🇬', nombre:'egipto' },
    { bandera:'🇿🇦', nombre:'sudafrica' },
    { bandera:'🇸🇦', nombre:'arabia saudita' },
    { bandera:'🇦🇪', nombre:'emiratos arabes unidos' },
    { bandera:'🇮🇩', nombre:'indonesia' },
    { bandera:'🇹🇭', nombre:'tailandia' },
    { bandera:'🇻🇳', nombre:'vietnam' },
    { bandera:'🇵🇭', nombre:'filipinas' },
    { bandera:'🇳🇿', nombre:'nueva zelanda' },
    { bandera:'🇵🇱', nombre:'polonia' },
    { bandera:'🇺🇦', nombre:'ucrania' },
    { bandera:'🇬🇷', nombre:'grecia' }

]

const bandera = {

async ejecutar(sock,mensaje){

const jid =
mensaje.key.remoteJid

const userJid =
mensaje.key.participant ||
mensaje.key.remoteJid

const enCooldown =
await verificarCooldown(
userJid,
'bandera',
3
)

if(enCooldown){

return await sock.sendMessage(
jid,
{
text:
`⏳ Espera *${enCooldown} minutos* para jugar otra vez`
},
{
quoted:mensaje
}
)

}

const pais =
paises[
Math.floor(
Math.random()*
paises.length
)
]

let intentos=0
const maxIntentos=3

await registrarCooldown(
userJid,
'bandera',
3
)

await sock.sendMessage(
jid,
{
text:
`🏳️ *ADIVINA LA BANDERA*

${pais.bandera}

Tienes *${maxIntentos} intentos*

Escribe el nombre del país`
},
{
quoted:mensaje
}
)

global.juegosActivos =
global.juegosActivos || {}

global.juegosActivos[
`${jid}-${userJid}`
]={

timeout:null,

respuestaEspecial:
async(texto)=>{

texto=
texto
.toLowerCase()
.trim()

intentos++

if(
texto===pais.nombre
){

delete global.juegosActivos[
`${jid}-${userJid}`
]

const victorias=
await registrarVictoria(
userJid,
sock,
jid,
mensaje
)

await darRecompensaJuego(
userJid,
8,
30
)

await intentarDarEstrella(
userJid,
sock,
jid,
mensaje
)

await sock.sendMessage(
jid,
{
text:
`✅ *CORRECTO*

🌍 País:
${pais.nombre}

✨ +8 XP
💰 +30 monedas
🏆 Victorias: ${victorias}`
}
)

return true

}

if(
intentos>=maxIntentos
){

delete global.juegosActivos[
`${jid}-${userJid}`
]

await sock.sendMessage(
jid,
{
text:
`❌ *Sin intentos*

🌍 Respuesta:

${pais.bandera}
*${pais.nombre}*`
}
)

return true
}

await sock.sendMessage(
jid,
{
text:
`❌ Incorrecto

Intentos restantes:
${maxIntentos-intentos}`
}
)

return true

}

}

}

}

export default bandera