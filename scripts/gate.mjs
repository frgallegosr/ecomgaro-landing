#!/usr/bin/env node
// 8 checks binarios contra el contrato de diseño. Exit 0 si los 8 pasan, exit 1 si alguno falla.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).filter((a) => a !== '--json');
const asJson = process.argv.includes('--json');
const projectRoot = args[0] ? join(process.cwd(), args[0]) : join(__dirname, '..');

function findContractDir() {
  const candidates = [join(projectRoot, 'brand'), projectRoot];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'brand.json'))) return dir;
  }
  return null;
}

const contractDir = findContractDir();
const results = [];

function addResult(name, pass, detail) {
  results.push({ name, pass, detail });
}

if (!contractDir) {
  console.error('No se encontró brand.json en brand/ ni en la raíz del proyecto. Sin contrato no hay gate.');
  process.exit(1);
}

function loadJSON(file) {
  const p = join(contractDir, file);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

const brand = loadJSON('brand.json');
const voiceFile = loadJSON('voice.json');
const motionFile = loadJSON('motion.json');
const voice = voiceFile ? voiceFile.voice : null;
const motion = motionFile ? motionFile.motion : null;

// ---------- helpers ----------
function hexToRgb(hex) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function relativeLuminance({ r, g, b }) {
  const chan = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function walkFiles(dir, exts, skipDirs, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch (e) { return out; }
  for (const entry of entries) {
    const full = join(dir, entry);
    let stat;
    try { stat = statSync(full); } catch (e) { continue; }
    if (stat.isDirectory()) {
      if (skipDirs.includes(entry)) continue;
      walkFiles(full, exts, skipDirs, out);
    } else if (exts.includes(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

// ---------- Check 1: forbidden_colors ----------
{
  const defaults = ['#6366F1', '#8B5CF6', '#A855F7'];
  const forbidden = (brand.anti_slop && brand.anti_slop.forbidden_colors) || defaults;
  const primary = brand.tokens?.colors?.primary?.hex;
  const accent = brand.tokens?.colors?.accent?.hex;
  const hit = [primary, accent].filter((c) => c && forbidden.map((f) => f.toUpperCase()).includes(c.toUpperCase()));
  addResult('forbidden_colors', hit.length === 0,
    hit.length ? `primary/accent usan un color prohibido: ${hit.join(', ')}` : 'primary y accent fuera de la lista de morados por defecto');
}

// ---------- Check 2: restricted_hues ----------
{
  const range = (brand.anti_slop && brand.anti_slop.restricted_hue_range_hsl) || [235, 285];
  const primary = brand.tokens?.colors?.primary?.hex;
  const archetypePrimary = brand.archetype?.primary;
  const allowedBehaviors = brand.archetype?.allowed_behaviors || [];
  const exception = archetypePrimary === 'Magician' || allowedBehaviors.includes('purple_as_primary');
  let pass = true, detail = '';
  if (primary) {
    const { h } = rgbToHsl(hexToRgb(primary));
    const inRange = h >= range[0] && h <= range[1];
    pass = !inRange || exception;
    detail = inRange
      ? (exception ? `hue ${h.toFixed(1)}° dentro del rango restringido pero excepción declarada (${archetypePrimary === 'Magician' ? 'archetype Magician' : 'purple_as_primary'})` : `primary ${primary} tiene hue ${h.toFixed(1)}°, dentro del rango prohibido [${range[0]},${range[1]}]`)
      : `primary ${primary} hue ${h.toFixed(1)}° fuera del rango restringido`;
  }
  addResult('restricted_hues', pass, detail);
}

// ---------- Check 3: max_fonts ----------
{
  const max = brand.validation?.max_fonts ?? 2;
  const families = brand.tokens?.typography?.families || [];
  // colapsa superfamilias (mismo primer token antes de espacio/guion)
  const bases = new Set(families.map((f) => f.family.split(/[\s-]/)[0].toLowerCase()));
  addResult('max_fonts', bases.size <= max, `${bases.size} familia(s) única(s) [${[...bases].join(', ')}] contra máximo ${max}`);
}

// ---------- Check 4: max_radius_values ----------
{
  const max = brand.validation?.max_radius_values ?? 3;
  const shape = brand.tokens?.shape || {};
  const radiusValues = new Set(
    Object.entries(shape)
      .filter(([k]) => k.startsWith('radius'))
      .map(([, v]) => v)
  );
  addResult('max_radius_values', radiusValues.size <= max, `${radiusValues.size} valor(es) distinto(s) [${[...radiusValues].join(', ')}] contra máximo ${max}`);
}

// ---------- Check 5: contrast_body ----------
{
  const min = brand.validation?.min_contrast_body ?? 4.5;
  const text = brand.tokens?.colors?.text?.hex;
  const bg = brand.tokens?.colors?.background?.hex;
  if (text && bg && text.startsWith('#') && bg.startsWith('#')) {
    const ratio = contrastRatio(text, bg);
    addResult('contrast_body', ratio >= min, `text ${text} sobre background ${bg} = ${ratio.toFixed(2)}:1 (mínimo ${min}:1)`);
  } else {
    addResult('contrast_body', false, 'text o background no están en formato hex, no se pudo calcular');
  }
}

// ---------- Check 6: archetype_coherence ----------
{
  const rules = { Outlaw: (t) => t.provocation >= 4, Sage: (t) => t.hype <= 1, Creator: (t) => t.hype <= 2, Caregiver: (t) => t.warmth >= 4, Lover: (t) => t.warmth >= 4 };
  const archetype = brand.archetype?.primary;
  const toneAxes = voice?.tone_axes;
  if (rules[archetype] && toneAxes) {
    const pass = rules[archetype](toneAxes);
    addResult('archetype_coherence', pass, `${archetype} contra voice.tone_axes: ${JSON.stringify(toneAxes)}`);
  } else {
    addResult('archetype_coherence', true, `${archetype || '(sin arquetipo)'} no tiene regla numérica implementada — pasa sin verificación real`);
  }
}

// ---------- Check 7: animated_props_safe ----------
{
  const unsafe = motion?.unsafe_props || ['width', 'height', 'top', 'left', 'right', 'bottom', 'padding', 'margin'];
  const exts = ['.css', '.tsx', '.jsx', '.html'];
  const skipDirs = ['node_modules', 'dist', 'build', '.next', '.git', 'brand'];
  const files = walkFiles(projectRoot, exts, skipDirs);
  const offenders = [];
  const transitionRe = /transition(?:-property)?\s*:\s*([^;]+);/gi;
  for (const file of files) {
    let content;
    try { content = readFileSync(file, 'utf8'); } catch (e) { continue; }
    let m;
    while ((m = transitionRe.exec(content))) {
      const decl = m[1];
      if (/\ball\b/.test(decl)) {
        offenders.push(`${file}: "transition: all" (peor caso, incluye todas las props inseguras)`);
        continue;
      }
      for (const prop of unsafe) {
        const propRe = new RegExp(`(^|[\\s,])${prop}([\\s,]|$)`);
        if (propRe.test(decl)) {
          offenders.push(`${file}: transition sobre "${prop}"`);
        }
      }
    }
  }
  addResult('animated_props_safe', offenders.length === 0,
    offenders.length ? offenders.join('\n    ') : `${files.length} archivo(s) escaneados (.css/.tsx/.jsx/.html), sin transiciones sobre props inseguras`);
}

// ---------- Check 8: anti_slop_patterns ----------
{
  const patterns = (brand.anti_slop && brand.anti_slop.forbidden_patterns) || [];
  const nonEmpty = patterns.filter((p) => p && p.trim().length > 0);
  addResult('anti_slop_patterns', nonEmpty.length >= 7, `${nonEmpty.length} patrón(es) prohibido(s) contra mínimo 7`);
}

// ---------- reporte ----------
const passCount = results.filter((r) => r.pass).length;
const allPass = passCount === results.length;

if (asJson) {
  console.log(JSON.stringify({ pass: allPass, score: `${passCount}/${results.length}`, results }, null, 2));
} else {
  console.log(`GATE: ${passCount}/${results.length}\n`);
  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
    console.log(`    ${r.detail}`);
  }
}

process.exit(allPass ? 0 : 1);
