// src/chiste.js
// Envía un chiste aleatorio

const chistes = [
    '¿Por qué los pájaros vuelan al sur? Porque caminando tardarían demasiado. 😄',
    '¿Qué le dice un techo a otro techo? Techo de menos. 🏠',
    '¿Por qué el libro de matemáticas estaba triste? Porque tenía demasiados problemas. 📚',
    '¿Qué hace una abeja en el gimnasio? ¡Zum-ba! 🐝',
    '¿Cómo se despiden los químicos? Ácido un placer. 🧪',
    '¿Qué le dijo el 0 al 8? Bonito cinturón. 🥋',
    '¿Por qué el espantapájaros ganó un premio? Porque era sobresaliente en su campo. 🌾',
    '¿Qué hace un perro con un taladro? ¡Ladra-taladra! 🐶.',
    '¿Por qué el café fue a la policía? Porque lo estaban moliendo. ☕',
    '¿Cómo organiza una fiesta en el espacio? Lo planeta todo. 🪐',
    '¿Qué le dice un jardinero a otro? Me alegra verte, colega. 🌱',
    '¿Por qué la escoba está feliz? Porque barrió con la competencia. 🧹',
    '¿Qué hace un pez mago? Nada por aquí, nada por allá. 🐟',
    '¿Por qué el tomate se puso rojo? Porque vio la ensalada sin vestirse. 🍅',
    '¿Qué le dijo el semáforo al auto? No me mires que me estoy cambiando. 🚦',
]

export default {
    nombre: 'chiste',
    descripcion: 'Cuenta un chiste aleatorio',
    uso: '.chiste',

    async ejecutar(sock, mensaje, args) {
        const jid = mensaje.key.remoteJid
        const chiste = chistes[Math.floor(Math.random() * chistes.length)]
        await sock.sendMessage(jid, { text: `😂 ${chiste}` })
    }
}