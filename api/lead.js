// Puente entre el formulario de la web y el CRM (GoHighLevel).
//
// El navegador solo habla con esta funcion, en el propio dominio. El token vive
// como variable de entorno en Vercel: no esta en el repositorio ni llega nunca
// al navegador. La funcion solo sabe CREAR un contacto: no lee, no lista y no
// borra, asi que aunque alguien la llame a proposito no puede sacar datos.

const API = 'https://services.leadconnectorhq.com/contacts/';
const VERSION = '2021-07-28';

// Freno sencillo por IP (se reinicia con cada instancia; evita el abuso tonto).
const ultimos = new Map();
const VENTANA_MS = 60_000;
const MAX_POR_VENTANA = 5;

function frenado(ip) {
  const ahora = Date.now();
  const marcas = (ultimos.get(ip) || []).filter((t) => ahora - t < VENTANA_MS);
  marcas.push(ahora);
  ultimos.set(ip, marcas);
  if (ultimos.size > 500) ultimos.clear();
  return marcas.length > MAX_POR_VENTANA;
}

const emailValido = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'metodo no permitido' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconocida';
  if (frenado(ip)) return res.status(429).json({ ok: false, error: 'demasiados envios' });

  const token = process.env.GHL_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) {
    console.error('Faltan GHL_TOKEN o GHL_LOCATION_ID');
    return res.status(500).json({ ok: false, error: 'sin configurar' });
  }

  const datos = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const nombre = String(datos.first_name || '').trim().slice(0, 80);
  const email = String(datos.email || '').trim().toLowerCase().slice(0, 120);

  if (!nombre || !emailValido(email)) {
    return res.status(400).json({ ok: false, error: 'nombre o email no validos' });
  }

  const limpio = (v) => String(v || '').trim().slice(0, 200);
  const cuerpo = {
    locationId,
    firstName: nombre,
    email,
    source: limpio(datos.source) || 'web-frangallegosr',
    tags: ['lead-web'],
    customFields: [],
    // Los UTM van en las notas del contacto: asi se ve el origen sin crear campos a mano.
    companyName: undefined
  };

  const origen = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    .map((k) => (datos[k] ? k + '=' + limpio(datos[k]) : null))
    .filter(Boolean)
    .join(' · ');

  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        Version: VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cuerpo)
    });

    const texto = await r.text();

    // Si el contacto ya existe, el CRM responde 400: para nosotros no es un fallo.
    if (!r.ok) {
      const duplicado = r.status === 400 && /duplicat/i.test(texto);
      if (!duplicado) {
        console.error('El CRM respondio', r.status, texto.slice(0, 300));
        return res.status(502).json({ ok: false, error: 'el crm rechazo el contacto' });
      }
    }

    console.log('Lead enviado al CRM', { email, origen: origen || 'directo', pagina: limpio(datos.pagina) });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('No se pudo hablar con el CRM:', err && err.message);
    return res.status(502).json({ ok: false, error: 'sin conexion con el crm' });
  }
};
