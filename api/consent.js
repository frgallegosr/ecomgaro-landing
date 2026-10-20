// Registro de consentimiento de cookies.
//
// El RGPD obliga a poder demostrar quien acepto, cuando y con que version de la
// politica. Esta funcion recibe esa prueba desde la web y la guarda como una
// fila en una hoja de calculo de Fran. No se guarda ningun dato personal: solo
// un identificador aleatorio de navegador que no permite saber quien es.
//
// La URL de la hoja y la clave viven como variables de entorno en Vercel, asi
// que nadie puede escribir en la hoja desde fuera.

const ultimos = new Map();
const VENTANA_MS = 60_000;
const MAX_POR_VENTANA = 10;

function frenado(ip) {
  const ahora = Date.now();
  const marcas = (ultimos.get(ip) || []).filter((t) => ahora - t < VENTANA_MS);
  marcas.push(ahora);
  ultimos.set(ip, marcas);
  if (ultimos.size > 500) ultimos.clear();
  return marcas.length > MAX_POR_VENTANA;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconocida';
  if (frenado(ip)) return res.status(429).json({ ok: false });

  const destino = process.env.CONSENT_SHEET_URL;
  const clave = process.env.CONSENT_SHEET_KEY;
  if (!destino || !clave) {
    console.error('Faltan CONSENT_SHEET_URL o CONSENT_SHEET_KEY');
    return res.status(500).json({ ok: false });
  }

  const datos = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const decision = datos.decision === 'granted' ? 'granted' : 'denied';
  const limpio = (v, max) => String(v || '').trim().slice(0, max);

  try {
    // No se espera la respuesta de Google: el visitante no debe notar nada.
    const r = await fetch(destino, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clave,
        id: limpio(datos.id, 60),
        decision,
        version: limpio(datos.version, 20),
        pagina: limpio(datos.pagina, 300),
        idioma: limpio(datos.idioma, 20)
      })
    });
    if (!r.ok) console.error('La hoja respondio', r.status);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('No se pudo registrar el consentimiento:', err && err.message);
    // Se responde 200 igualmente: un fallo aqui no debe romper el banner.
    return res.status(200).json({ ok: false });
  }
};
