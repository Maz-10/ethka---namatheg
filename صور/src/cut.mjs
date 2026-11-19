// ═══ القَصّة — زاويةٌ من الصورة مقصوصةٌ على شكل المعيّن ═══
// معيّنُ الشعار مكبَّرًا، مركزُه قربَ أهدأ زوايا الصورة: ما وقع منه داخل الصورة يُقصّ منها ويُملأ بليل الهويّة،
// فيبدو حدُّ القصّ قُطرًا مائلًا ينتهي برأسين مدوّرين كرؤوس المعيّن نفسِه. على الحدّ خيطٌ ذهبيّ رفيع،
// والشعارُ في المساحة المقصوصة.

import { C, LOGO, hex, rgba, f, place, lockup, head } from './common.mjs'

const P = {
  size: 0.78,    // قطرُ المعيّن من الضلع الأقصر
  inset: 0.1,    // بُعدُ مركزه عن الزاوية إلى الداخل (فيظهر رأساه المدوّران)
  logo: 0.2,     // عرضُ الشعار من الضلع الأقصر
  margin: 0.075, // بُعدُ الشعار عن حافّتَي الزاوية
}

export function html({ photo, pg, c, look }) {
  const { W, H, u } = pg
  const [kx, ky] = c.k
  const m = Math.min(W, H), B = LOGO.box.mark
  const D = P.size * m, a = P.inset * m
  const cx = kx ? W - a : a, cy = ky ? H - a : a
  const d = place(LOGO.diamond, { s: D / B.w, ax: B.x + B.w / 2, ay: B.y + B.h / 2, ox: cx, oy: cy })
  const lw = P.logo * m, lh = (lw * LOGO.box.lockup.h) / LOGO.box.lockup.w, mg = P.margin * m
  const lx = kx ? W - mg - lw : mg, ly = ky ? H - mg - lh : mg

  return head(pg, look, `
.cut{position:absolute;inset:0;filter:drop-shadow(0 0 ${f(1.2 * u)}px ${rgba(C.night, 0.45)})}
.logo{position:absolute;left:${f(lx)}px;top:${f(ly)}px}`) + `
<img class="ph" src="${photo}" alt="">
<svg class="cut" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><radialGradient id="deep" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(D * 0.6)}">
    <stop offset="0" stop-color="${hex(C.night)}"/><stop offset="1" stop-color="${hex(C.night2)}"/></radialGradient></defs>
  <path d="${d}" fill="url(#deep)"/>
  <path d="${d}" fill="none" stroke="${hex(C.gold)}" stroke-width="${f(0.2 * u)}"/>
</svg>
<div class="logo">${lockup(lw)}</div>
</body></html>`
}
