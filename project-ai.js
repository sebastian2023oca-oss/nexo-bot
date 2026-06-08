const fs = require("fs");
const path = require("path");

function readFiles(dir, files = []) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);

        if (fs.statSync(fullPath).isDirectory()) {
            readFiles(fullPath, files);
        } else {
            if (item.endsWith(".js") || item.endsWith(".sql") || item.endsWith(".json")) {
                files.push({
                    path: fullPath,
                    content: fs.readFileSync(fullPath, "utf8")
                });
            }
        }
    }

    return files;
}

module.exports = { readFiles };

const { readFiles } = require("./project-ai");
const axios = require("axios");

async function askAI(question) {
    const files = readFiles("./"); // carpeta Nexo-Bot

    let context = "";

    for (const file of files) {
        context += `\n\nFILE: ${file.path}\n${file.content}`;
    }

    const response = await axios.post("http://localhost:11434/api/generate", {
        model: "deepseek-coder:6.7b-instruct",
        prompt: `
Eres un senior developer experto en bots de WhatsApp.

Este es el proyecto completo:

${context}

---

Tarea del usuario:
${question}

Responde con código listo para producción.
        `,
        stream: false
    });

    console.log(response.data.response);
}

// ejemplo
askAI("crea un comando /balance con SQL y handler completo");