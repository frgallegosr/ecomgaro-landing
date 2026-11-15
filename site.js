/* Web de Fran Gallegos — comportamiento compartido por las 5 páginas.
   La landing (/empieza-aqui/) NO usa este archivo: lleva su script dentro.
   Las claves de localStorage/sessionStorage son las mismas que usa la landing,
   para que la decisión de cookies y el origen (UTM) valgan en todo el dominio. */
(function () {
  'use strict';

  var doc = document;
  var menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============= Consent Mode v2: denegado por defecto ============= */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied'
  });

  /* ============= Cabecera ============= */
  var header = doc.querySelector('.site-header');
  var toggle = doc.querySelector('.nav-toggle');
  var links = doc.getElementById('navLinks');

  if (header) {
    var solida = null;
    var pintarCabecera = function () {
      var s = window.scrollY > 24;
      if (s !== solida) { header.classList.toggle('is-solid', s); solida = s; }
    };
    window.addEventListener('scroll', pintarCabecera, { passive: true });
    pintarCabecera();
  }

  function cerrarMenu() {
    if (!header || !toggle) return;
    header.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
  }

  if (header && toggle && links) {
    toggle.addEventListener('click', function () {
      var abierto = header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      toggle.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });
    links.addEventListener('click', function (e) { if (e.target.closest('a')) cerrarMenu(); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) { cerrarMenu(); toggle.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 880) cerrarMenu(); }, { passive: true });
  }

  /* Marca la página actual en el menú (el HTML del menú es idéntico en todas). */
  (function () {
    var limpia = function (p) { return p.replace(/index\.html$/, '').replace(/\/+$/, '') || '/'; };
    var aqui = limpia(location.pathname);
    doc.querySelectorAll('.nav-links a').forEach(function (a) {
      if (limpia(new URL(a.href).pathname) === aqui) a.setAttribute('aria-current', 'page');
    });
  })();

  /* ============= Cookies (propio, sin CMP externo) ============= */
  var STORAGE_KEY = 'ecomgaro_cookie_consent';
  var VERSION_KEY = 'ecomgaro_cookie_consent_version';
  var VISITOR_KEY = 'ecomgaro_visitor_id';
  var POLICY_VERSION = '2026-10-20';
  var GA_ID = 'G-1R6M0KHT8L';
  var META_PIXEL_ID = '1132329755676018';
  var analyticsLoaded = false;
  var pixelLoaded = false;

  function leer(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }
  function guardar(clave, valor) { try { localStorage.setItem(clave, valor); } catch (e) {} }

  function getVisitorId() {
    var id = leer(VISITOR_KEY);
    if (!id) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random();
      guardar(VISITOR_KEY, id);
    }
    return id || 'sin-identificador';
  }

  /* Prueba del consentimiento, guardada en servidor (exigible con el RGPD). */
  function registrarConsentimiento(granted) {
    try {
      fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          id: getVisitorId(),
          decision: granted ? 'granted' : 'denied',
          version: POLICY_VERSION,
          pagina: location.href,
          idioma: navigator.language || ''
        })
      }).catch(function () {});
    } catch (e) {}
  }

  /* gtag.js solo se carga tras aceptar: sin consentimiento no sale nada hacia Google. */
  function loadAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;
    var s = doc.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    doc.head.appendChild(s);
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  }

  /* Píxel de Meta: igual, solo tras el consentimiento. */
  function loadMetaPixel() {
    if (pixelLoaded) { window.fbq('consent', 'grant'); return; }
    pixelLoaded = true;
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, doc, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function clearAnalyticsCookies() {
    if (pixelLoaded && typeof window.fbq === 'function') window.fbq('consent', 'revoke');
    doc.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0 && name !== '_fbp' && name !== '_fbc') return;
      ['', '; domain=' + location.hostname, '; domain=.' + location.hostname].forEach(function (d) {
        doc.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d;
      });
    });
  }

  function applyConsent(granted) {
    window.gtag('consent', 'update', {
      ad_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied',
      analytics_storage: granted ? 'granted' : 'denied'
    });
    if (granted) { loadAnalytics(); loadMetaPixel(); }
    else clearAnalyticsCookies();
  }

  (function () {
    var banner = doc.createElement('div');
    banner.id = 'cookie-consent';
    banner.className = 'cookie';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Consentimiento de cookies');
    banner.hidden = true;
    banner.innerHTML =
      '<p>Uso cookies de analítica y de publicidad (Google y Meta) para medir y mejorar mis anuncios. ' +
      'Puedes aceptarlas o rechazarlas. <a href="/politica-cookies.html">Más información</a>.</p>' +
      '<div class="cookie-actions">' +
      '<button type="button" class="btn btn--outline" data-cookie="reject">Rechazar</button>' +
      '<button type="button" class="btn btn--outline" data-cookie="accept">Aceptar</button>' +
      '</div>';
    doc.body.appendChild(banner);

    /* Si la decisión se tomó con otra versión de la política, se vuelve a preguntar. */
    if (leer(VERSION_KEY) !== POLICY_VERSION) { try { localStorage.removeItem(STORAGE_KEY); } catch (e) {} }

    /* En pantallas bajas (móviles pequeños) el aviso taparía el botón principal de
       la portada. En ese caso espera a que el visitante haga scroll: no se pierde
       nada, porque sin consentimiento no se carga ningún medidor. */
    function mostrarAviso() {
      banner.hidden = false;
      var cta = doc.querySelector('.hero-actions .btn');
      if (!cta || window.scrollY > 40) return;
      var b = banner.getBoundingClientRect();
      var c = cta.getBoundingClientRect();
      if (b.top >= c.bottom + 8 || c.top >= window.innerHeight) return;
      banner.hidden = true;
      var alBajar = function () {
        if (window.scrollY <= 40) return;
        window.removeEventListener('scroll', alBajar);
        if (leer(STORAGE_KEY) !== 'granted' && leer(STORAGE_KEY) !== 'denied') banner.hidden = false;
      };
      window.addEventListener('scroll', alBajar, { passive: true });
    }

    var saved = leer(STORAGE_KEY);
    if (saved === 'granted' || saved === 'denied') applyConsent(saved === 'granted');
    else mostrarAviso();

    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cookie]');
      if (!b) return;
      var granted = b.getAttribute('data-cookie') === 'accept';
      guardar(STORAGE_KEY, granted ? 'granted' : 'denied');
      guardar(VERSION_KEY, POLICY_VERSION);
      applyConsent(granted);
      registrarConsentimiento(granted);
      banner.hidden = true;
    });

    doc.querySelectorAll('[data-cookie-reopen]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); banner.hidden = false; });
    });
  })();

  /* ============= Eventos =============
     Solo se envían si el visitante aceptó las cookies. El formulario de la web
     marca Contact en Meta (no Lead) para no mezclarse con los anuncios de la landing. */
  var META_EVENTS = { whatsapp_click: 'Contact', generate_lead: 'Contact' };
  function trackEvent(name, params) {
    if (leer(STORAGE_KEY) !== 'granted') return;
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
    if (META_EVENTS[name] && typeof window.fbq === 'function') window.fbq('track', META_EVENTS[name]);
  }

  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('wa.me') !== -1) trackEvent('whatsapp_click', { cta_location: a.dataset.cta || 'sin_identificar' });
    else if (href.indexOf('mailto:') === 0) trackEvent('email_click', { cta_location: a.dataset.cta || 'pie' });
    else if (a.dataset.red) trackEvent('social_click', { network: a.dataset.red });
    else if (a.dataset.cta) trackEvent('cta_click', { cta_location: a.dataset.cta });
  });

  /* ============= Origen del visitante (UTM) ============= */
  var ORIGEN_KEY = 'ecomgaro_origen';
  var PARAMS_ORIGEN = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
  (function () {
    try {
      var url = new URLSearchParams(location.search);
      var origen = {};
      PARAMS_ORIGEN.forEach(function (k) { var v = url.get(k); if (v) origen[k] = v; });
      if (Object.keys(origen).length) sessionStorage.setItem(ORIGEN_KEY, JSON.stringify(origen));
    } catch (e) {}
  })();
  function leerOrigen() {
    try { return JSON.parse(sessionStorage.getItem(ORIGEN_KEY) || '{}'); } catch (e) { return {}; }
  }

  /* ============= Aparición al hacer scroll ============= */
  (function () {
    var els = doc.querySelectorAll('.reveal');
    if (!els.length) return;
    if (menosMovimiento || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) {
      /* Escalonado dentro de cada grupo: 90 ms, máximo 3 pasos (brand/motion.json). */
      var hermanos = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, function (c) { return c.classList.contains('reveal'); }) : [el];
      el.style.setProperty('--d', ((hermanos.indexOf(el) % 3) * 90) + 'ms');
      io.observe(el);
    });
  })();

  /* ============= Carruseles de trabajos =============
     Duplica las tarjetas para que el bucle no tenga corte. Las copias quedan fuera
     del teclado y de los lectores de pantalla (inert + aria-hidden). La velocidad
     es la misma en todos los carruseles (~30 px/s) aunque tengan distinto número
     de tarjetas. Con «reducir movimiento» no se toca nada: queda la fila deslizable. */
  (function () {
    var carruseles = doc.querySelectorAll('[data-carrusel]');
    if (!carruseles.length || menosMovimiento) return;
    var PX_POR_SEGUNDO = 30;
    var ajustar = function (c) {
      var pista = c.querySelector('.carrusel-pista');
      var recorrido = pista.scrollWidth / 2;
      if (recorrido > 0) c.style.setProperty('--dur', Math.round(recorrido / PX_POR_SEGUNDO) + 's');
    };
    carruseles.forEach(function (c) {
      var pista = c.querySelector('.carrusel-pista');
      if (!pista) return;
      Array.prototype.slice.call(pista.children).forEach(function (t) {
        var copia = t.cloneNode(true);
        copia.setAttribute('aria-hidden', 'true');
        copia.setAttribute('inert', '');
        copia.querySelectorAll('a, button').forEach(function (el) { el.setAttribute('tabindex', '-1'); });
        if (copia.matches('a')) copia.setAttribute('tabindex', '-1');
        pista.appendChild(copia);
      });
      c.classList.add('is-auto');
      ajustar(c);
    });
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { carruseles.forEach(ajustar); }, 200);
    }, { passive: true });
  })();

  /* ============= Animaciones de fondo: se pausan fuera de pantalla ============= */
  (function () {
    var zonas = doc.querySelectorAll('[data-anim]');
    if (!zonas.length || menosMovimiento || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-paused', !en.isIntersecting); });
    }, { threshold: 0 });
    zonas.forEach(function (z) { io.observe(z); });
  })();

  /* ============= Índice de la página de servicios ============= */
  (function () {
    var enlaces = doc.querySelectorAll('.svc-index a');
    if (!enlaces.length || !('IntersectionObserver' in window)) return;
    var porId = {};
    enlaces.forEach(function (a) { porId[a.getAttribute('href').replace('#', '')] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        enlaces.forEach(function (a) { a.classList.remove('is-active'); });
        if (porId[en.target.id]) porId[en.target.id].classList.add('is-active');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(porId).forEach(function (id) { var s = doc.getElementById(id); if (s) io.observe(s); });
  })();

  /* ============= Formulario de contacto ============= */
  (function () {
    var form = doc.querySelector('[data-contact-form]');
    if (!form) return;
    var estado = form.querySelector('.form-status');
    var boton = form.querySelector('button[type="submit"]');
    var textoBoton = boton ? boton.innerHTML : '';
    var emailValido = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };

    var reglas = [
      { campo: 'first_name', ok: function (v) { return v.trim().length > 0; } },
      { campo: 'email', ok: function (v) { return emailValido(v.trim()); } },
      { campo: 'mensaje', ok: function (v) { return v.trim().length >= 5; } },
      { campo: 'privacidad', ok: function (v, el) { return el.checked; } }
    ];

    function marcar(el, valido) {
      var err = doc.getElementById(el.getAttribute('aria-describedby'));
      el.setAttribute('aria-invalid', valido ? 'false' : 'true');
      if (err) err.hidden = valido;
    }

    reglas.forEach(function (r) {
      var el = form.elements[r.campo];
      if (!el) return;
      el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', function () {
        if (el.getAttribute('aria-invalid') === 'true' && r.ok(el.value, el)) marcar(el, true);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (estado) estado.textContent = '';
      var primero = null;
      reglas.forEach(function (r) {
        var el = form.elements[r.campo];
        if (!el) return;
        var valido = r.ok(el.value, el);
        marcar(el, valido);
        if (!valido && !primero) primero = el;
      });
      if (primero) { primero.focus(); return; }

      var datos = {
        first_name: form.elements.first_name.value.trim(),
        email: form.elements.email.value.trim(),
        mensaje: form.elements.mensaje.value.trim(),
        web: form.elements.web ? form.elements.web.value : '',
        source: 'web-contacto',
        pagina: location.pathname
      };
      var origen = leerOrigen();
      Object.keys(origen).forEach(function (k) { datos[k] = origen[k]; });

      form.classList.add('is-sending');
      if (boton) boton.textContent = 'Enviando…';

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('estado ' + r.status)); })
        .then(function (res) {
          if (!res || !res.ok) throw new Error('respuesta no válida');
          trackEvent('generate_lead', { form: 'contacto', pagina: location.pathname });
          var hecho = doc.createElement('div');
          hecho.className = 'form-done';
          hecho.setAttribute('role', 'status');
          hecho.tabIndex = -1;
          hecho.innerHTML =
            '<span class="tick" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' +
            '<h3>Mensaje enviado.</h3><p>Te escribo pronto al email que me has dejado.</p>';
          form.replaceWith(hecho);
          hecho.focus();
        })
        .catch(function () {
          form.classList.remove('is-sending');
          if (boton) boton.innerHTML = textoBoton;
          if (estado) estado.textContent = 'No se ha podido enviar. Inténtalo de nuevo o escríbeme por WhatsApp.';
        });
    });
  })();
})();
