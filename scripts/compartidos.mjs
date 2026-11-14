#!/usr/bin/env node
// Bloques compartidos entre las 5 páginas de la web (cabecera común, menú, pie y contacto).
//
// La web no tiene build: cada página es un HTML completo. Para que el menú y el
// pie no se desincronicen, la fuente es index.html y este script:
//
//   node scripts/compartidos.mjs          comprueba que todas las páginas coinciden (exit 1 si no)
//   node scripts/compartidos.mjs --sync   copia los bloques de index.html al resto
//
// Un bloque va entre <!-- NOMBRE:INICIO --> y <!-- NOMBRE:FIN -->. En una página
// nueva basta con escribir <!--@NOMBRE--> donde deba ir y ejecutar --sync.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const FUENTE = 'index.html';
const PAGINAS = {
  'sobre-mi/index.html': ['HEAD', 'NAV', 'PIE'],
  'servicios/index.html': ['HEAD', 'NAV', 'PIE'],
  'trabajos/index.html': ['HEAD', 'NAV', 'PIE'],
  'contacto/index.html': ['HEAD', 'NAV', 'PIE', 'CONTACTO']
};
const sync = process.argv.includes('--sync');

const leer = (f) => readFileSync(join(raiz, f), 'utf8');
const marca = (n, lado) => `<!-- ${n}:${lado} -->`;

function bloque(html, nombre) {
  const a = html.indexOf(marca(nombre, 'INICIO'));
  const b = html.indexOf(marca(nombre, 'FIN'));
  if (a === -1 || b === -1 || b < a) return null;
  return html.slice(a, b + marca(nombre, 'FIN').length);
}

const fuente = leer(FUENTE);
let fallos = 0;

for (const [archivo, nombres] of Object.entries(PAGINAS)) {
  let html = leer(archivo);
  let cambiado = false;

  for (const nombre of nombres) {
    const original = bloque(fuente, nombre);
    if (!original) { console.error(`[FALLO] ${FUENTE}: falta el bloque ${nombre}`); fallos++; continue; }

    const hueco = `<!--@${nombre}-->`;
    const actual = bloque(html, nombre);

    if (actual === original) { console.log(`[OK]    ${archivo}: ${nombre}`); continue; }

    if (!sync) {
      console.error(`[FALLO] ${archivo}: ${nombre} ${actual ? 'no coincide con ' + FUENTE : 'no está'}`);
      fallos++;
      continue;
    }

    if (actual) html = html.replace(actual, () => original);
    else if (html.includes(hueco)) html = html.replace(hueco, () => original);
    else { console.error(`[FALLO] ${archivo}: no hay bloque ni hueco para ${nombre}`); fallos++; continue; }
    cambiado = true;
    console.log(`[SYNC]  ${archivo}: ${nombre}`);
  }

  if (cambiado) writeFileSync(join(raiz, archivo), html);
}

if (fallos) {
  console.error(`\n${fallos} bloque(s) sin sincronizar. Ejecuta: node scripts/compartidos.mjs --sync`);
  process.exit(1);
}
console.log('\nBloques compartidos: todo coincide.');
