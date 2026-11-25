// Copie l'application web dans mobile/www en excluant les données personnelles et les fichiers de travail.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '..');
const out = resolve(here, 'www');
const EXCLUDE = new Set(['mobile', 'old', 'README.md', 'data']);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(src, out, { recursive: true, filter: p => !EXCLUDE.has(basename(p)) || resolve(p) === src });

// Retire les balises <script> des fichiers de données exclus
const idx = resolve(out, 'index.html');
writeFileSync(idx, readFileSync(idx, 'utf8').replace(/<script src="data\/base_excel2?\.js"><\/script>\n?/g, ''));
console.log('Application copiée dans', out);
