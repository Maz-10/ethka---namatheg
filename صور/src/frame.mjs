// ═══ اللوح — الصورةُ مركّبةً في ورق إذكاء ═══
// الفكرة من «المَجمَع الساكن» (`../الفلسفة-المجمع-الساكن.md`): الكثرةُ حين تنتظم حول نقطةٍ واحدة.
//   • نطوّقها: تُركَّب الصورةُ في حاشيةٍ من ورق الهويّة كما تُركَّب المطبوعةُ في متحف — بحافّة قطعٍ مشطوفة،
//     وحولها طوقٌ من خيطٍ شعريّ، في زواياه معيّناتُ الشعار نفسِه، وفي منتصف أضلاعه علاماتُ المحور؛
//     ومعيّنٌ واحدٌ ذهبيّ في الزاوية العليا اليمنى، حيث تبدأ القراءةُ العربيّة. «الذهبُ نادرٌ فيُرى».
//   • نغشاها: تذهيبٌ خفيف — الظلالُ تميل إلى ليل الهويّة، والأضواءُ إلى كريميّها، والأوساطُ إلى ذهبها —
//     كما كانت المطبوعاتُ تُذهَّب قديمًا؛ فتصير صورُ اللقاء كلُّها من نَفَسٍ واحد ولا تفقد ألوانها.
//   • الختم: الشعارُ في السجلّ تحت الصورة، على محور التناظر، صغيرًا كبطاقة المتحف.
// ولا كلامَ على اللوح: مكانُ الكلام نصُّ المنشور والتقرير.
// كلُّ لونٍ من `../عروض/src/brand.mjs`، وكلُّ شكلٍ من الشعار نفسِه (`identity.mjs`) — لا قيمةَ مُرتجلة.

import { C, mix } from '../../عروض/src/brand.mjs'
import { LOGO } from '../../عروض/src/identity.mjs'

const hex = (h) => '#' + h
const rgba = (h, a) => `rgba(${[0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',')},${a})`
const ch = (h) => [0, 2, 4].map((i) => +(parseInt(h.slice(i, i + 2), 16) / 255).toFixed(4))
const f = (n) => +n.toFixed(2)

/** نغمتا اللوح — الورقُ هو الأساس (سطحُ الهويّة الفاتح)، والليلُ بديلُه (سطحُ الغلاف والختام). */
export const TONES = {
  'ورق': {
    mat: C.cream, bevel: C.paper, cut: rgba(C.ink, 0.16), bead: C.ink, beadOp: 0.42, gemOp: 0.78,
    ink: C.logoInk, // «أسودُ الملف على الفاتح» — حبرُ الشعار
    grain: { blend: 'multiply', op: 0.07 },
  },
  'ليل': {
    mat: C.night, bevel: C.night3, cut: rgba(C.pearl, 0.1), bead: C.pearl, beadOp: 0.32, gemOp: 0.7,
    ink: C.white, // «أبيضُه على الداكن»
    grain: { blend: 'screen', op: 0.035 },
  },
}

/** النِّسَب — كلُّها من وحدةٍ واحدة: الحاشيةُ `M` جزءٌ من عرض اللوح، وما سواها أضعافُها. */
const P = {
  W: 1200,        // عرضُ اللوح (بكسل CSS) — والمخرجُ ضعفُه ما سمحت دقّةُ الصورة
  margin: 0.064,  // الحاشيةُ الجانبيّة والعليا من العرض
  record: 2.35,   // السجلُّ تحت الصورة: أضعافُ الحاشية (الأسفلُ أعرضُ كما في تركيب المطبوعات)
  chain: 0.42,    // بُعدُ الطوق عن حافّة الصورة
  bead: 0.085,    // وحدةُ المعيّن (من الحاشية)
  corner: 1.75,   // معيّنُ الزاوية أكبرُ من الوحدة
  hair: 0.0007,   // سُمكُ الخيط الشعريّ من عرض اللوح
  bevel: 0.0034,  // حافّةُ القطع المشطوفة حول الصورة
  logo: 0.14,     // عرضُ الشعار من عرض اللوح
  aspect: [0.8, 1.91], // حدودُ المنصّات (إنستغرام: من ‎4:5‎ إلى ‎1.91:1‎) — يتّسع اللوحُ ولا تُقصّ الصورة
}

/** القرارُ الثالث — هندسةُ اللوح لصورةٍ بنسبتها: الصورةُ كاملةٌ أبدًا، والحاشيةُ هي التي تتكيّف. */
export function plate(an) {
  const W = P.W, r = an.W / an.H
  const M = P.margin * W, R = P.record * M
  let pw = W - 2 * M, ph = pw / r, x = M, y = M
  let H = y + ph + R
  if (W / H < P.aspect[0]) { // صورةٌ طويلة: يثبت ارتفاعُ اللوح على ‎4:5‎ وتتّسع الحاشيتان الجانبيّتان
    H = W / P.aspect[0]; ph = H - y - R; pw = ph * r; x = (W - pw) / 2
  }
  if (W / H > P.aspect[1]) { // صورةٌ بانوراميّة: يُزاد في الحاشيتين العليا والسفلى
    const extra = W / P.aspect[1] - H
    y += extra * 0.45; H += extra
  }
  // الكثافة: ضعفُ اللوح، ولا تُعرض الصورةُ بأكبرَ من بكسلاتها
  const dpr = +Math.min(2, an.W / pw).toFixed(4)
  return { W, H: Math.round(H), M, x, y, pw, ph, dpr }
}

const b = LOGO.box.mark
const L = LOGO.box.lockup

/** الطوق: خيطٌ شعريّ يحيط بالصورة على بُعدٍ محسوب، وفي كلّ زاويةٍ معيّنٌ من الشعار يقف الخيطُ دونه بفُرجة —
 *  كما تُقطع الخطوطُ عند العلامات في ألواح المسح. وفي منتصف كلّ ضلعٍ شَرطةٌ قصيرة تعامد الخيطَ: علامةُ محورٍ
 *  تقيس ولا تزخرف. والمعيّنُ الذهبيّ وحده في الزاوية العليا اليمنى، حيث تبدأ القراءةُ العربيّة. */
function chain(g, T) {
  const off = P.chain * g.M, d = P.bead * g.M * P.corner, gap = d * 0.95, tick = P.bead * g.M * 1.5
  const x0 = g.x - off, y0 = g.y - off, x1 = g.x + g.pw + off, y1 = g.y + g.ph + off
  const sw = f(P.hair * g.W)
  const line = (ax, ay, bx, by) => `<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}"/>`
  const lines = [
    line(x0 + gap, y0, x1 - gap, y0), line(x0 + gap, y1, x1 - gap, y1),
    line(x0, y0 + gap, x0, y1 - gap), line(x1, y0 + gap, x1, y1 - gap),
  ]
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  const ticks = [
    line(cx, y0 - tick / 2, cx, y0 + tick / 2), line(cx, y1 - tick / 2, cx, y1 + tick / 2),
    line(x0 - tick / 2, cy, x0 + tick / 2, cy), line(x1 - tick / 2, cy, x1 + tick / 2, cy),
  ]
  const gem = (x, y, gold) => `<use href="#dm" x="${f(x - d / 2)}" y="${f(y - d / 2)}" width="${f(d)}" height="${f(d)}" fill="${gold ? hex(C.gold) : hex(T.bead)}" opacity="${gold ? 1 : T.gemOp}"/>`
  const svg = `<g stroke="${hex(T.bead)}" stroke-opacity="${T.beadOp}" stroke-width="${sw}" stroke-linecap="square">${lines.join('')}${ticks.join('')}</g>` +
    gem(x0, y0) + gem(x0, y1) + gem(x1, y1) + gem(x1, y0, true)
  return { svg, bottom: y1 }
}

/** الغشاء: تذهيبٌ بقدر `strength` — السطوعُ يُرسم على تدرّجٍ من ليل الهويّة إلى ذهبها إلى كريميّها،
 *  ثم يُمزج بالصورة. والمستوياتُ قبله. */
function veilFilter(lv, strength) {
  const stops = [C.night, mix(mix(C.night, C.cream, 0.5), C.gold, 0.3), C.cream].map(ch)
  const table = (k) => stops.map((c) => c[k]).join(' ')
  const lin = `type="linear" slope="${lv.slope}" intercept="${lv.intercept}"`
  return `<filter id="veil" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
    <feComponentTransfer in="SourceGraphic" result="lv"><feFuncR ${lin}/><feFuncG ${lin}/><feFuncB ${lin}/></feComponentTransfer>
    <feColorMatrix in="lv" type="matrix" result="lum" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"/>
    <feComponentTransfer in="lum" result="tone"><feFuncR type="table" tableValues="${table(0)}"/><feFuncG type="table" tableValues="${table(1)}"/><feFuncB type="table" tableValues="${table(2)}"/></feComponentTransfer>
    <feComposite in="lv" in2="tone" operator="arithmetic" k1="0" k2="${f(1 - strength)}" k3="${f(strength)}" k4="0"/>
  </filter>`
}

/** الصفحةُ كاملة. `photo` مسارُ الصورة، و`g` هندسةُ اللوح، و`look` قراراتُ الضوء والغشاء، و`tone` نغمةُ اللوح. */
export function html({ photo, g, look, tone }) {
  const T = TONES[tone]
  const { W, H } = g
  const ring = chain(g, T)
  const bv = P.bevel * W
  const lw = P.logo * W, lh = (lw * L.h) / L.w
  // الختم: وسطَ ما بين الطوق وأسفل اللوح، مرفوعًا قليلًا (المركزُ البصريّ فوق الهندسيّ)
  const ly = ring.bottom + (H - ring.bottom - lh) * 0.47

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${hex(T.mat)}}
body{position:relative}
.grain{position:absolute;inset:0;mix-blend-mode:${T.grain.blend};opacity:${T.grain.op}}
svg.art{position:absolute;inset:0}
.bevel{position:absolute;left:${f(g.x - bv)}px;top:${f(g.y - bv)}px;width:${f(g.pw + 2 * bv)}px;height:${f(g.ph + 2 * bv)}px;background:${hex(T.bevel)};box-shadow:0 0 0 .5px ${T.cut}}
.ph{position:absolute;left:${f(g.x)}px;top:${f(g.y)}px;width:${f(g.pw)}px;height:${f(g.ph)}px;overflow:hidden}
.ph img{display:block;width:100%;height:100%;filter:url(#veil)}
.ph .vig{position:absolute;inset:0;background:radial-gradient(ellipse 80% 80% at 50% 45%,transparent 62%,${rgba(C.night, 0.14)} 100%)}
.ph .inset{position:absolute;inset:0;box-shadow:inset 0 1px 2.5px ${rgba(C.night, 0.28)},inset 0 0 0 .5px ${rgba(C.night, 0.14)}}
.seal{position:absolute;left:${f((W - lw) / 2)}px;top:${f(ly)}px}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs>
  ${veilFilter(look.levels, look.veil)}
  <filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
</defs></svg>

<svg class="grain" width="${W}" height="${H}"><rect width="100%" height="100%" filter="url(#paper)"/></svg>

<svg class="art" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><symbol id="dm" viewBox="${b.x} ${b.y} ${b.w} ${b.h}"><path d="${LOGO.diamond}"/></symbol></defs>
  ${ring.svg}
</svg>

<div class="bevel"></div>
<div class="ph"><img src="${photo}" alt=""><div class="vig"></div><div class="inset"></div></div>

<div class="seal"><svg viewBox="${L.x} ${L.y} ${L.w} ${L.h}" width="${f(lw)}" height="${f(lh)}" role="img" aria-label="إذكاء" style="display:block">
  <path d="${LOGO.name}" fill="${hex(T.ink)}"/><path d="${LOGO.dots}" fill="${hex(T.ink)}"/>
  <path d="${LOGO.nameGold}" fill="${hex(C.gold)}"/><path d="${LOGO.diamond}" fill="${hex(C.gold)}"/></svg></div>
</body></html>`
}
