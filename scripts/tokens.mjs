#!/usr/bin/env node
// Compila brand/brand.json -> brand/brand.css (3 niveles: primitivos, semánticos, componente)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const brandDir = join(projectRoot, 'brand');

function loadJSON(name) {
  const p = join(brandDir, name);
  if (!existsSync(p)) {
    console.error(`No se encontró ${name} en ${brandDir}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, 'utf8'));
}

const brand = loadJSON('brand.json');
const colors = brand.tokens.colors;
const shape = brand.tokens.shape;
const spacing = brand.tokens.spacing;
const fontFamily = brand.tokens.typography.families[0];

const lines = [];
lines.push('/* Generado por scripts/tokens.mjs desde brand/brand.json — NO EDITAR A MANO */');
lines.push('');
lines.push(':root {');
lines.push('  /* ---- Nivel 1: primitivos ---- */');
for (const [key, val] of Object.entries(colors)) {
  lines.push(`  --color-${key.replace(/_/g, '-')}: ${val.hex}; /* ${val.name} */`);
}
lines.push(`  --font-primary: '${fontFamily.family}', ${fontFamily.fallback};`);
lines.push(`  --radius-sm: ${shape.radius_sm}px;`);
lines.push(`  --radius-md: ${shape.radius_md}px;`);
lines.push(`  --radius-lg: ${shape.radius_lg}px;`);
lines.push(`  --radius-full: 999px; /* píldora, documentada aparte — no cuenta en la escala de 3 */`);
lines.push(`  --border-width: ${shape.border_width}px;`);
lines.push(`  --space-unit: ${spacing.unit}px;`);
for (const [key, val] of Object.entries(spacing.section)) {
  lines.push(`  --space-section-${key}: ${val}px;`);
}
for (const [key, val] of Object.entries(spacing.gap)) {
  lines.push(`  --space-gap-${key}: ${val}px;`);
}
lines.push('');
lines.push('  /* ---- Nivel 2: semánticos ---- */');
lines.push('  --surface-bg: var(--color-background);');
lines.push('  --surface-panel: var(--color-surface);');
lines.push('  --surface-elevated: var(--color-surface-elevated);');
lines.push('  --text-default: var(--color-text);');
lines.push('  --text-muted: var(--color-text-muted);');
lines.push('  --text-subtle: var(--color-text-subtle);');
lines.push('  --border-default: var(--color-border);');
lines.push('  --action-primary: var(--color-primary);');
lines.push('  --action-primary-hover: var(--color-primary-deep);');
lines.push('  --action-accent: var(--color-accent);');
lines.push('  --state-success: var(--color-success);');
lines.push('  --state-danger: var(--color-danger);');
lines.push('  --state-warning: var(--color-warning);');
lines.push('');
lines.push('  /* ---- Nivel 3: componente ---- */');
lines.push('  --btn-radius: var(--radius-full);');
lines.push('  --card-radius: var(--radius-md);');
lines.push('  --section-radius: var(--radius-lg);');
lines.push('  --btn-bg: var(--action-primary);');
lines.push('  --btn-bg-hover: var(--action-primary-hover);');
lines.push('  --card-bg: var(--surface-panel);');
lines.push('  --card-border: var(--border-default);');
lines.push('}');
lines.push('');

const css = lines.join('\n');
const outPath = join(brandDir, 'brand.css');
writeFileSync(outPath, css, 'utf8');
console.log(`brand.css escrito en ${outPath} (${lines.length} líneas)`);
