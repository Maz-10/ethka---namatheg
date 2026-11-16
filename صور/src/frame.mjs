// ═══ الإطار — هويّةُ إذكاء على الصورة، بلا كلام ═══
// الصورةُ كاملةٌ تملأ المقاس، وفوقها الهويّةُ وحدها: موجةٌ زجاجيّة بلون الليل في أسفلها، حافّتُها خيطٌ ذهبيّ،
// وعلى قمّتها المعيّنُ الذهبيّ بحلقةٍ وتوهّج، وفوقها خطوطُ تموّجٍ تهدأ كلّما ارتفعت؛ والشعارُ داخل الموجة.
// لا عنوانَ ولا وصفَ ولا تاريخ — الكلامُ مكانُه نصُّ المنشور والتقرير.
// كلُّ لونٍ من `../عروض/src/brand.mjs` وكلُّ شكلٍ من الشعار نفسِه (`identity.mjs`) — لا قيمةَ مُرتجلة هنا.

import { C } from '../../عروض/src/brand.mjs'
import { LOGO } from '../../عروض/src/identity.mjs'

const hex = (h) => '#' + h
const rgba = (h, a) => `rgba(${[0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',')},${a})`
const f = (n) => +n.toFixed(2)

/** المقاسات — بكسل CSS. `H: null` يعني نسبةَ الصورة نفسِها، و`dpr: null` دقّةَ الأصل، و`whole` ألّا يُقتطع منها شيء.
 *  `safeBottom` ما تغطّيه واجهةُ القصص أسفلَ الشاشة، فتعلو الموجةُ والشعارُ فوقه. */
export const FORMATS = {
  'الأصل': { W: 1600, H: null, dpr: null, whole: true, use: 'كلّ المنصّات — الصورةُ كاملةً بنسبتها' },
  'أفقي': { W: 1600, H: 900, dpr: 1.5, use: 'إكس · لينكدإن (‎16:9‎)' },
  'عمودي': { W: 1080, H: 1350, dpr: 1, use: 'منشور إنستغرام (‎4:5‎)' },
  'قصة': { W: 1080, H: 1920, dpr: 1, use: 'القصص · سناب شات (‎9:16‎)', safeBottom: 250 },
}

/** يُتمّ المقاسَ بأبعاد الصورة: الارتفاعُ من نسبتها، والكثافةُ من عرضها (بلا تكبيرٍ فوق بكسلاتها، وبسقف ٤٠٩٦). */
export function resolveFormat(F, an) {
  const H = F.H ?? Math.round((F.W * an.H) / an.W)
  const dpr = F.dpr ?? Math.min(an.W, 4096) / F.W
  return { ...F, H, dpr, safeBottom: F.safeBottom || 0 }
}

/** وحدةُ المقاس: جزءٌ من مئةٍ من ضلعه الأقصر — فتتناسب الموجةُ والشعارُ في كلّ نسبة. */
const unit = (F) => Math.min(F.W, F.H) / 100

/** الموجة: أساسيّةٌ وتوافقيّةٌ خفيفة تكسر انتظامَها، وقمّتُها حيث طُلبت. */
export function wave(F) {
  const { W, H } = F
  const u = unit(F)
  const y0 = H - F.safeBottom - 11.5 * u, A = 1.9 * u, k = F.W > F.H ? 1 : 0.85, crest = 0.8
  const a2 = 0.22, k2 = 2.15
  const p1 = -Math.PI / 2 - 2 * Math.PI * k * crest
  const p2 = -Math.PI / 2 - 2 * Math.PI * k * k2 * crest // التوافقيّةُ في طورها عند القمّة فلا تزحزحها
  const fy = (x) => y0 + (A * (Math.sin((2 * Math.PI * k * x) / W + p1) + a2 * Math.sin((2 * Math.PI * k * k2 * x) / W + p2))) / (1 + a2)
  const N = 220
  const pts = []
  for (let i = 0; i <= N; i++) { const x = -4 + ((W + 8) * i) / N; pts.push([x, fy(x)]) }
  let top = Infinity, bottom = -Infinity
  for (const [, y] of pts) { top = Math.min(top, y); bottom = Math.max(bottom, y) }
  const d = 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')
  /** موجةٌ موازية فوق الحافّة بمسافة `up`، تتسطّح بقدر `damp` — تموّجٌ ينتشر ويهدأ. */
  const echo = (up, damp) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y0 - up + (y - y0) * damp)}`).join(' L')
  return { fy, d, echo, crest: { x: crest * W, y: fy(crest * W) }, top, bottom, u }
}

/** خانةُ الصورة: المقاسُ كلُّه، والظاهرُ منها ما فوق الموجة (عليه يُحسب الاقتطاع). */
export function photoBox(F) {
  const wv = wave(F)
  return { w: F.W, h: F.H, aspect: F.W / F.H, vis: { x: 0, y: 0, w: 1, h: wv.top / F.H } }
}

/** الشريطُ الذي يلي الموجةَ من الصورة — عليه تُقاس شدّةُ التعتيم (كسورٌ من الخانة). */
export function scrimZone(F) {
  const wv = wave(F)
  const top = Math.max(0, wv.top - 24 * wv.u)
  return { x: 0, y: top / F.H, w: 1, h: (wv.top - top) / F.H }
}

const b = LOGO.box.mark
const DIAMOND_SYMBOL = `<symbol id="dm" viewBox="${b.x} ${b.y} ${b.w} ${b.h}"><path d="${LOGO.diamond}"/></symbol>`
const L = LOGO.box.lockup
const LOCKUP = (w) => `<svg viewBox="${L.x} ${L.y} ${L.w} ${L.h}" width="${f(w)}" height="${f((w * L.h) / L.w)}" role="img" aria-label="إذكاء" style="display:block">
  <path d="${LOGO.name}" fill="${hex(C.white)}"/><path d="${LOGO.dots}" fill="${hex(C.white)}"/>
  <path d="${LOGO.nameGold}" fill="${hex(C.gold)}"/><path d="${LOGO.diamond}" fill="${hex(C.gold)}"/></svg>`

/** حقلُ المعيّنات: صفوفٌ تتبع الموجةَ تحت حافّتها، تتّقد قربَ القمّة وتخفت بالبعد عنها —
 *  «المجمعُ الساكن» همسًا في الموجة لا زخرفًا. */
function field(F, wv) {
  const u = wv.u, s = 0.62 * u, gx = 2 * u, gy = 1.25 * u, rows = 6, reach = 0.34 * F.W
  let out = ''
  for (let r = 1; r <= rows; r++) {
    for (let x = (r % 2 ? gx / 2 : 0); x < F.W; x += gx) {
      const dist = Math.abs(x - wv.crest.x) / reach
      if (dist >= 1) continue
      const y = wv.fy(x) + r * gy + gy * 0.5
      if (y > F.H - F.safeBottom - u) continue
      const op = 0.2 * Math.pow(1 - dist, 1.6) * Math.pow(1 - (r - 1) / rows, 1.3)
      if (op < 0.01) continue
      out += `<use href="#dm" x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${f(s)}" height="${f(s)}" opacity="${f(op * 1000) / 1000}"/>`
    }
  }
  return `<g fill="${hex(C.pearl)}">${out}</g>`
}

/** الصفحةُ كاملة لمقاسٍ واحد. `photo` مسارُ الصورة، و`cut` نافذةُ الاقتطاع، و`look` قراراتُ الضوء والتعتيم. */
export function html(F, { photo, cut, look }) {
  const { W, H } = F
  const wv = wave(F)
  const u = wv.u
  const iw = W / cut.w, ih = H / cut.h
  const ix = -cut.x * iw, iy = -cut.y * ih
  const { crest } = wv
  const dm = 1.9 * u // قطرُ المعيّن الذهبيّ
  const gap = 2.1 * u // تباعدُ خطوط التموّج
  const ripple = [0.9, 0.6, 0.34, 0.16].map((op, i) =>
    `<path d="${wv.echo((i + 1) * gap * (1 + i * 0.18), 1 - (i + 1) * 0.16)}" stroke="url(#rg)" stroke-opacity="${op}" stroke-width="${f(0.19 * u)}" fill="none"/>`).join('')
  const bandD = `${wv.d} L${W + 4} ${H + 4} L-4 ${H + 4} Z`
  const scrimTop = wv.top - 24 * u

  // الشعار: يسارَ الموجة (والقمّةُ يمينًا) — وسطَ المسافة بين أخفض الحافّة فوقه وأسفلِ المساحة الآمنة
  const logoW = 17 * u, logoH = (logoW * L.h) / L.w, logoX = 5.5 * u
  let edge = -Infinity
  for (let x = logoX; x <= logoX + logoW; x += 4) edge = Math.max(edge, wv.fy(x))
  const floor = H - F.safeBottom
  const logoY = edge + (floor - edge - logoH) / 2 + 0.2 * u

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${hex(C.night)}}
body{position:relative}
.ph{position:absolute;inset:0;overflow:hidden}
.ph img{position:absolute;left:${f(ix)}px;top:${f(iy)}px;width:${f(iw)}px;height:${f(ih)}px;filter:url(#lv)}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse 78% 80% at 50% 40%,transparent 58%,${rgba(C.night, 0.3)} 100%)}
.scrim{position:absolute;left:0;right:0;top:${f(scrimTop)}px;bottom:0;background:linear-gradient(to bottom,${rgba(C.night, 0)} 0%,${rgba(C.night, look.scrim * 0.55)} 55%,${rgba(C.night, look.scrim)} 100%)}
.band{position:absolute;inset:0;clip-path:path('${bandD}');background:${rgba(C.night, 0.74)};backdrop-filter:blur(${f(1.4 * u)}px) saturate(1.1);-webkit-backdrop-filter:blur(${f(1.4 * u)}px)}
svg.art{position:absolute;inset:0}
.logo{position:absolute;left:${f(logoX)}px;top:${f(logoY)}px}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs>
  <filter id="lv" color-interpolation-filters="sRGB"><feComponentTransfer>
    <feFuncR type="linear" slope="${look.levels.slope}" intercept="${look.levels.intercept}"/>
    <feFuncG type="linear" slope="${look.levels.slope}" intercept="${look.levels.intercept}"/>
    <feFuncB type="linear" slope="${look.levels.slope}" intercept="${look.levels.intercept}"/>
  </feComponentTransfer></filter>
</defs></svg>

<div class="ph"><img src="${photo}" alt=""><div class="vig"></div><div class="scrim"></div></div>
<div class="band"></div>

<svg class="art" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${DIAMOND_SYMBOL}
    <linearGradient id="rg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">
      <stop offset="0" stop-color="${hex(C.pearl)}" stop-opacity="0"/>
      <stop offset="${f((crest.x / W) * 0.55)}" stop-color="${hex(C.pearl)}" stop-opacity=".35"/>
      <stop offset="${f(crest.x / W)}" stop-color="${hex(C.pearl)}" stop-opacity="1"/>
      <stop offset="1" stop-color="${hex(C.pearl)}" stop-opacity=".25"/>
    </linearGradient>
    <linearGradient id="eg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">
      <stop offset="0" stop-color="${hex(C.gold)}" stop-opacity=".18"/>
      <stop offset="${f(crest.x / W)}" stop-color="${hex(C.gold)}" stop-opacity="1"/>
      <stop offset="1" stop-color="${hex(C.gold)}" stop-opacity=".35"/>
    </linearGradient>
    <radialGradient id="glow" cx="${f(crest.x)}" cy="${f(crest.y)}" r="${f(dm * 4.2)}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${hex(C.gold)}" stop-opacity=".42"/><stop offset=".4" stop-color="${hex(C.gold)}" stop-opacity=".1"/><stop offset="1" stop-color="${hex(C.gold)}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g>${ripple}</g>
  ${field(F, wv)}
  <path d="${wv.d}" stroke="url(#eg)" stroke-width="${f(0.24 * u)}" fill="none"/>
  <circle cx="${f(crest.x)}" cy="${f(crest.y)}" r="${f(dm * 4.2)}" fill="url(#glow)"/>
  <circle cx="${f(crest.x)}" cy="${f(crest.y)}" r="${f(dm * 1.05)}" fill="none" stroke="${hex(C.gold)}" stroke-opacity=".7" stroke-width="${f(0.15 * u)}"/>
  <use href="#dm" x="${f(crest.x - dm / 2)}" y="${f(crest.y - dm / 2)}" width="${f(dm)}" height="${f(dm)}" fill="${hex(C.gold)}"/>
</svg>

<div class="logo">${LOCKUP(logoW)}</div>
</body></html>`
}
