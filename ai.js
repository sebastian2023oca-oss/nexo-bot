const fs = require("fs");
const axios = require("axios");

// cargar índice
const repo = JSON.parse(fs.readFileSync("./repo-index.json", "utf8"));

// búsqueda simple (luego se puede mejorar con embeddings)
function search(question) {
    const q = question.toLowerCase();

    return repo
        .filter(f =>
            f.content.toLowerCase().includes(q) ||
            f.path.toLowerCase().includes(q)
        )
        .slice(0, 5);
}

async function ask(question) {

    const files = search(question);

    let context = files.map(f =>
`FILE: ${f.path}
${f.content}`
    ).join("\n\n-----------------\n\n");

    const res = await axios.post("http://localhost:11434/api/generate", {
        model: "deepseek-coder:6.7b-instruct",
        prompt: `
Eres un senior backend engineer experto en Node.js, SQL y bots de WhatsApp.

REGLAS:
- Usa SOLO el contexto del proyecto
- Devuelve código completo listo para producción
- Si hace falta, incluye SQL y estructura de handlers
- No inventes archivos que no existan

CONTEXTO DEL PROYECTO:
${context}

TAREA:
${question}
        `,
        stream: false
    });

    console.log("\n🧠 RESPUESTA IA:\n");
    console.log(res.data.response);
}

// ejemplo
ask("crear comando /balance con SQL y handler completo");