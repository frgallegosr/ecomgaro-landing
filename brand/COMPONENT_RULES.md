# Reglas de componentes

Traducción en prosa de `brand.json`, `voice.json` y `motion.json`. Léelo antes de escribir o tocar cualquier componente de esta landing.

Postura visual de referencia: sistema disciplinado (Ruler) que explica antes de vender (Sage). Frío, geométrico en disciplina aunque redondeado en forma, con voz propia pero sin gritar.

---

## Botón

- Forma: **píldora, 999px de radio** (fully rounded). No es parte de la escala de 3 radios — es la forma por defecto de cualquier control interactivo (botón, badge, chip de navegación).
- Color primario (`#39FF14`, verde neón) reservado para **una única acción por pantalla o sección**. Si al tapar el CTA principal con el dedo sigues viendo el verde en dos sitios más, sobra.
- Estado hover: usa `primary_deep` (`#2DCC10`), nunca opacidad genérica.
- Transición: solo `transform` (scale ligero) y `opacity`, duración `fast` (200ms), easing estándar. Nunca anima `width`, `height` ni `padding`.
- Texto del botón: 1-2 palabras, sin exclamación, sin urgencia fingida. Ej. "Contáctanos", "Ver sistema" — nunca "¡Empieza ya!".

## Tarjeta

- Radio: `radius_md` (16px) para tarjetas de contenido (casos de éxito, trabajos, pasos del proceso). `radius_lg` (24px) solo para contenedores de sección grandes.
- Fondo: `surface` o `surface_elevated`, nunca un color plano fuera de la paleta de 13 tokens definida.
- Borde: 1px, `border` (línea de vidrio, blanco al 10%). No dupliques con sombra fuerte además de borde — uno de los dos hace el trabajo, no los dos.
- Hover: `translateY` ligero (transform, no `top`) + cambio de `border-color` hacia el accent o primary según contexto. Duración `base` (400ms).
- Máximo 3 tarjetas idénticas seguidas sin que una tenga jerarquía distinta (tamaño, posición o énfasis) si en el fondo una importa más que las otras.

## Navegación

- Barra tipo píldora (999px), fondo `liquid-glass` (blanco 4% + blur), nunca fondo sólido.
- En móvil (<880px): menú hamburguesa con panel desplegable, nunca ocultar los enlaces sin dar una forma de acceder a ellos.
- El CTA principal (`Contáctanos`) siempre visible en la barra, incluso en móvil — no se esconde detrás del hamburguesa.
- Foco de teclado visible en todos los enlaces e íconos, sin `outline: none` sin sustituto.

## Formulario (para cuando exista)

- Inputs con `radius_sm` (8px), borde `border` en reposo, `accent` en foco.
- Mensajes de error: `danger` (`#FF5C5C`), y siempre dicen **qué hacer después**, no solo que algo falló.
- Nunca el color como único portador de significado — acompaña con ícono o texto.
- Placeholder nunca sustituye a un `<label>` visible.

## Modal / overlay (para cuando exista)

- Fondo `surface_elevated`, radio `radius_lg` (24px).
- Cierre siempre accesible por click fuera, tecla Escape y botón visible — las tres vías, no solo una.
- Acciones destructivas: confirmación explícita, nunca ejecución directa al primer clic.
- Entrada con `ease-out`, salida con `ease-in`, duración `base` (400ms). Nunca animar `top`/`left` para posicionarlo — usar `transform` + `opacity`.

---

## Voz — reglas rápidas de copy

- Español de España, tuteo. Nunca usted, nunca voseo.
- Cero signos de exclamación. Cero cuentas regresivas o "últimas plazas" falsas.
- Todo dato de escasez que se comunique tiene que ser real (ej. "máx. 5 clientes/mes" es cierto, no se inventa uno nuevo).
- Evita la lista de `avoid_words` en `voice.json` — si aparece un adjetivo de esa lista, sustitúyelo por el número que lo respalda, no por un sinónimo.

## Movimiento — reglas rápidas

- Solo `transform` y `opacity` se animan. Nunca `width`, `height`, `top`, `left`, `margin`, `padding`.
- Cuatro duraciones con nombre: `micro` 120ms, `fast` 200ms, `base` 400ms, `slow` 600ms. Nada de valores sueltos tipo `duration: 350ms`.
- Una sola curva: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`.
- `prefers-reduced-motion` se respeta siempre, sin excepción, en cualquier animación decorativa.
