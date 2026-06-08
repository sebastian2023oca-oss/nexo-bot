const fs = require("fs");
const path = require("path");

function walk(dir, out = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        // evitar basura
        if (fullPath.includes("node_modules")) continue;
        if (fullPath.includes(".git")) continue;

        if (stat.isDirectory()) {
            walk(fullPath, out);
        } else {
            if (
                file.endsWith(".js") ||
                file.endsWith(".sql") ||
                file.endsWith(".json")
            ) {
                out.push({
                    path: fullPath,
                    content: fs.readFileSync(fullPath, "utf8")
                });
            }
        }
    }

    return out;
}

const repo = walk("./");

fs.writeFileSync(
    "repo-index.json",
    JSON.stringify(repo, null, 2)
);

console.log("✔ Repo indexado:", repo.length, "archivos");