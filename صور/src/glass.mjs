// ═══ الزجاج — معيّناتُ الرمز الثلاثة كبيرةً، زجاجًا بلون الليل، تدخل من زاوية ═══
// الرمزُ نفسُه (النقاطُ الثلاث) مكبَّرًا حتى يصير عمارةً في الصورة: يدخل من أهدأ زواياها ويُقصّ عند الحافّة.
// كلُّ معيّنٍ لوحُ زجاجٍ مُصنفَر يموّه ما خلفه: السفليّان بلون الليل، والعلويُّ ذهبيّ. حوافُّها خيطٌ مضيء،
// وعلى أعلاها لمعةُ زجاج. واسمُ «إذكاء» صغيرًا داخل المعيّن الداخليّ — فالرمزُ والاسمُ معًا هما الشعار.

import { C, LOGO, PARTS, hex, rgba, f, place, subpath, wordmark, head } from './common.mjs'

const P = {
  size: 0.56,     // عرضُ الرمز من الضلع الأقصر
  bleedX: 0.2,    // ما يخرج من الرمز وراء الحافّة الجانبيّة (من عرضه): النقطةُ الخارجيّة تُقصّ
  bleedY: 0.05,   // وما يخرج وراء الحافّة العليا أو السفلى
  name: 0.62,     // عرضُ الاسم من عرض المعيّن الداخليّ
}

export function html({ photo, pg, c, look }) {
  const { W, H, u } = pg
  const [kx, ky] = c.k
  const eb = LOGO.box.emblem
  const E = P.size * Math.min(W, H), s = E / eb.w, Eh = eb.h * s
  // موضعُ صندوق الرمز: يخرج وراء الحافّتين عند الزاوية
  const ex = kx ? W - E + P.bleedX * E : -P.bleedX * E
  const ey = ky ? H - Eh + P.bleedY * E : -P.bleedY * E
  const T = { s, ax: eb.x, ay: eb.y, ox: ex, oy: ey }
  const shapes = [
    { d: place(LOGO.diamond, T), gold: true, b: PARTS.gem },
    { d: place(subpath(LOGO.dots, 0), T), b: PARTS.dotLeft },
    { d: place(subpath(LOGO.dots, 1), T), b: PARTS.dotRight },
  ]
  // المعيّنُ الداخليّ: الأقربُ إلى وسط الصورة من النقطتين — فيه الاسم
  const inner = kx ? PARTS.dotLeft : PARTS.dotRight
  const icx = ex + s * (inner.cx - eb.x), icy = ey + s * (inner.cy - eb.y)
  const nw = P.name * inner.w * s, nh = (nw * PARTS.name.h) / PARTS.name.w

  const blur = f(1.5 * u)
  const glass = shapes.map((g) => `<div class="g${g.gold ? ' gold' : ''}" style="clip-path:path('${g.d}')"></div>`).join('')
  const x0 = ex, y0 = ey, x1 = ex + E, y1 = ey + Eh
  const veil = `radial-gradient(circle at ${kx ? '100%' : '0%'} ${ky ? '100%' : '0%'},${rgba(C.night, look.veil * 0.5)} 0,${rgba(C.night, 0)} ${f(Math.hypot(W, H) * 0.5)}px)`

  return head(pg, look, `
.veil{position:absolute;inset:0;background:${veil}}
.g{position:absolute;inset:0;background:linear-gradient(${kx ? 225 : 135}deg,${rgba(C.pearl, 0.1)},${rgba(C.night, 0.5)} 60%);backdrop-filter:blur(${blur}px) saturate(1.15) brightness(.82);-webkit-backdrop-filter:blur(${blur}px) saturate(1.15) brightness(.82)}
.g.gold{background:linear-gradient(${kx ? 225 : 135}deg,${rgba(C.goldNight, 0.82)},${rgba(C.gold, 0.7)} 70%);backdrop-filter:blur(${blur}px) saturate(.6) brightness(1.1);-webkit-backdrop-filter:blur(${blur}px) saturate(.6) brightness(1.1)}
svg.edge{position:absolute;inset:0}
.name{position:absolute;left:${f(icx - nw / 2)}px;top:${f(icy - nh / 2)}px}`) + `
<img class="ph" src="${photo}" alt="">
<div class="veil"></div>
${glass}
<svg class="edge" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="rim" gradientUnits="userSpaceOnUse" x1="${f(kx ? x1 : x0)}" y1="${f(y0)}" x2="${f(kx ? x0 : x1)}" y2="${f(y1)}">
      <stop offset="0" stop-color="${hex(C.pearl)}" stop-opacity=".85"/><stop offset=".55" stop-color="${hex(C.pearl)}" stop-opacity=".3"/><stop offset="1" stop-color="${hex(C.pearl)}" stop-opacity=".12"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity=".16"/><stop offset=".45" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
  </defs>
  ${shapes.map((g) => `<path d="${g.d}" fill="url(#sheen)"/>`).join('')}
  ${shapes.map((g) => `<path d="${g.d}" fill="none" stroke="${g.gold ? hex(C.gold) : 'url(#rim)'}" stroke-opacity="${g.gold ? 0.95 : 1}" stroke-width="${f(0.16 * u)}"/>`).join('')}
</svg>
<div class="name">${wordmark(nw)}</div>
</body></html>`
}
