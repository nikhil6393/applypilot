import fs from 'node:fs';
import path from 'node:path';
const TEMPLATES_DIR = path.join(process.cwd(), 'server', 'templates');
export function getLatexTemplate(name) {
    const filePath = path.join(TEMPLATES_DIR, `${name}.tex`);
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
    }
    throw new Error(`LaTeX template '${name}' not found at ${filePath}`);
}
