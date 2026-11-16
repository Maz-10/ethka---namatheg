// ═══ الغلاف — «نافذةُ المعيّن» ═══
// أوّلُ صورةٍ في المنشور تُرى من نافذةٍ على شكل معيّن الشعار (برؤوسه المدوّرة)، على أرض الليل؛
// وحولها خيطٌ ذهبيّ رفيع بفُرجةٍ كحافّة التركيب، والشعارُ تحتها على المحور — فالغلافُ كلُّه هو الرمز:
// معيّنٌ كبيرٌ فيه الحدث، وتحته الاسم. (الإلهام: شكلُ الشعار نافذةً وإطارًا — ICP لبنتاغرام وBlank Street لوولف أولنز.)
// الذكاء: تُزاح النافذةُ حتى يحوي المعيّنُ أكثرَ ما يمكن من الموضوع (قناعُ الحدّة في smart.mjs).

import { C, LOGO, hex, rgba, f, place, lockup, head } from './common.mjs'

const P = {
  W: 1080, H: 1350, dpr: 2, // ‎4:5‎ — مقاسُ الغلاف في إنستغرام ولينكدإن، ويُعرض كاملًا في إكس
  window: 0.84,  // عرضُ النافذة من عرض الغلاف
  top: 0.07,     // بُعدُها عن الأعلى من الارتفاع
  ring: 1.04,    // الخيطُ الذهبيّ: أكبرُ من النافذة بهذه النسبة (فُرجةُ التركيب)
  logo: 0.3,     // عرضُ الشعار من عرض الغلاف
}

/** أفضلُ موضعٍ للنافذة: يُمرَّر المربّعُ على الصورة، ويُجمع قناعُ الموضوع داخل المعيّن المرسوم فيه
 *  (|س| + |ص| ≤ نصفُ الضلع)، مع ميلٍ خفيف إلى الوسط يحسم التعادل. */
function fit(an, mask, S) {
  const M = Buffer.from(mask.data, 'base64'), w = mask.w, h = mask.h, k = w / an.W
  const s = Math.round(S * k), r = s / 2
  let best = { score: -1, x: 0, y: 0 }
  for (let y = 0; y <= h - s; y += 2) for (let x = 0; x <= w - s; x += 2) {
    let sum = 0
    for (let j = 0; j < s; j += 2) {
      const dy = Math.abs(j - r), half = r - dy
      for (let i = Math.ceil(r - half); i < r + half; i += 2) sum += M[(y + j) * w + x + i]
    }
    const off = Math.hypot((x + r) / w - 0.5, (y + r) / h - 0.5)
    const score = sum * (1 - 0.15 * off)
    if (score > best.score) best = { score, x, y }
  }
  return { sx: best.x / k, sy: best.y / k }
}

export function page() {
  return { W: P.W, H: P.H, dpr: P.dpr, u: Math.min(P.W, P.H) / 100 }
}

export function html({ photo, pg, c, mask, look, an }) {
  const { W, H, u } = pg
  const B = LOGO.box.mark
  const D = P.window * W, cx = W / 2, cy = P.top * H + D / 2
  const at = (d) => place(LOGO.diamond, { s: d / B.w, ax: B.x + B.w / 2, ay: B.y + B.h / 2, ox: cx, oy: cy })

  // الاقتطاع: مربّعٌ بضلع الصورة الأقصر، يُزاح حتى يحوي **المعيّنُ** (لا المربّع) أكثرَ ما يمكن من الموضوع
  const S = Math.min(an.W, an.H)
  const { sx, sy } = fit(an, mask, S)
  const k = D / S
  const iw = an.W * k, ih = an.H * k, ix = cx - D / 2 - sx * k, iy = cy - D / 2 - sy * k

  const lw = P.logo * W, lh = (lw * LOGO.box.lockup.h) / LOGO.box.lockup.w
  const below = cy + (D * P.ring) / 2
  const ly = below + (H - below - lh) / 2

  return head(pg, look, `
body{background:radial-gradient(circle at 50% ${f((cy / H) * 100)}%,${hex(C.night2)} 0,${hex(C.night)} 70%)}
.win{position:absolute;inset:0;clip-path:path('${at(D)}')}
.win img{position:absolute;left:${f(ix)}px;top:${f(iy)}px;width:${f(iw)}px;height:${f(ih)}px;filter:url(#lv)}
.win .inner{position:absolute;inset:0;box-shadow:inset 0 0 ${f(4 * u)}px ${rgba(C.night, 0.35)}}
svg.ring{position:absolute;inset:0}
.logo{position:absolute;left:${f((W - lw) / 2)}px;top:${f(ly)}px}`) + `
<div class="win"><img src="${photo}" alt=""><div class="inner"></div></div>
<svg class="ring" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <path d="${at(D * P.ring)}" fill="none" stroke="${hex(C.gold)}" stroke-width="${f(0.2 * u)}"/>
</svg>
<div class="logo">${lockup(lw)}</div>
</body></html>`
}
