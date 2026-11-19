// ═══ تموّجُ المعيّن — هويّةُ إذكاء تنبع من زاويةٍ وتتّسع فوق الصورة ═══
// الصورةُ كاملةٌ من الحافّة إلى الحافّة، بلا حاشيةٍ ولا شريط. والهويّةُ تنبع من نقطةٍ واحدة:
//   • المنبع: الشعارُ في أهدأ زوايا الصورة، أبيضُ الحبر ذهبيُّ المعيّن.
//   • التموّج: من المعيّن الذهبيّ نفسِه تنتشر حلقاتٌ على شكله هو (مسارُ D_DIAMOND مكبَّرًا، برؤوسه المدوّرة) —
//     كتموّج الماء حول حجر، لكنّه تموّجُ شعارنا لا دوائرُ عامّة. القريبةُ ذهبيّةٌ واضحة، ثم تتباعد وتبهت
//     وتصير لؤلؤيّة، وتخفت قبل أن تبلغ موضوعَ الصورة (قناعُ الحدّة من smart.mjs).
//   • الغشاء: ظلٌّ بلون الليل يشتدّ عند الزاوية ويذوب نحو الوسط، أرضًا للشعار والحلقات.
//   • التطويق: كبارُ الحلقات تُقصّ عند حوافّ الصورة فتلتفّ عليها، وفي الزاوية المقابلة صدى حلقتين أو ثلاث.
// ولا كلامَ على الصورة. كلُّ لونٍ من `../عروض/src/brand.mjs` وكلُّ شكلٍ من الشعار نفسِه (`identity.mjs`).

import { C } from '../../عروض/src/brand.mjs'
import { LOGO } from '../../عروض/src/identity.mjs'

const hex = (h) => '#' + h
const rgba = (h, a) => `rgba(${[0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',')},${a})`
const f = (n) => +n.toFixed(2)

const L = LOGO.box.lockup, B = LOGO.box.mark
// مركزُ المعيّن الذهبيّ داخل الشعار (كسورٌ من صندوقه)، وقطرُه منه
const GEM = { fx: (B.x + B.w / 2 - L.x) / L.w, fy: (B.y + B.h / 2 - L.y) / L.h, fd: B.w / L.w }
// طرفُ الرمز الأيسر (النقاطُ الثلاث) من الشعار — ما يسارَه اسمُ «إذكاء»
const EMBLEM_LEFT = (LOGO.box.emblem.x - L.x) / L.w

/** النِّسَب — كلُّها من وحدة المقاس `u` (جزءٌ من مئةٍ من الضلع الأقصر). */
const P = {
  W: 1600,       // عرضُ الصفحة (بكسل CSS) — والمخرجُ بدقّة الصورة الأصليّة
  margin: 5.2,   // بُعدُ الشعار عن حافّتَي الزاوية
  logo: 21,      // عرضُ الشعار
  first: 4.1,    // الحلقةُ الأولى: أضعافُ قطر المعيّن — تحيط بالرمز كلِّه (نقاطه الثلاث) فلا تقطعه
  ratio: 1.33,   // نسبةُ اتّساع كلّ حلقةٍ عن سابقتها (تتباعد كتموّج الماء)
  gold: [0.95, 0.72, 0.5],  // الحلقاتُ الذهبيّة الأولى
  pearl: 0.62, fade: 0.86,  // ثم لؤلؤيّةٌ تبهت بهذه النسبة حلقةً بعد حلقة
  stroke: 0.2,   // سُمكُ الحلقة الأولى
  echo: [[0.22, 0.34], [0.32, 0.22], [0.44, 0.12]], // صدى الزاوية المقابلة: [القطرُ من القُطر, الشفافية]
}

/** أبعادُ الصفحة لصورةٍ بنسبتها، وكثافةُ التصيير بدقّتها (حتى ٤٠٩٦). */
export function page(an) {
  const W = P.W, H = Math.round((W * an.H) / an.W)
  return { W, H, dpr: +(Math.min(an.W, 4096) / W).toFixed(4), u: Math.min(W, H) / 100 }
}

/** حلقةٌ على شكل المعيّن بقطرٍ `d` ومركزٍ معطى — المسارُ نفسُه، والسُّمكُ ثابتٌ مهما كبرت. */
const ring = (cx, cy, d, color, op, sw) =>
  `<path d="${LOGO.diamond}" transform="translate(${f(cx)} ${f(cy)}) scale(${(d / B.w).toFixed(5)}) translate(${-(B.x + B.w / 2)} ${-(B.y + B.h / 2)})" fill="none" stroke="${hex(color)}" stroke-opacity="${f(op * 1000) / 1000}" stroke-width="${f(sw)}" vector-effect="non-scaling-stroke"/>`

/** الصفحةُ كاملة. `photo` مسارُ الصورة، و`pg` أبعادُها، و`c` الزاويةُ المختارة، و`mask` قناعُ الموضوع،
 *  و`look` قراراتُ الضوء والغشاء. */
export function html({ photo, pg, c, mask, look }) {
  const { W, H, u } = pg
  const [kx, ky] = c.k
  const lw = P.logo * u, lh = (lw * L.h) / L.w, m = P.margin * u
  const lx = kx ? W - m - lw : m, ly = ky ? H - m - lh : m
  const gx = lx + GEM.fx * lw, gy = ly + GEM.fy * lh, gd = GEM.fd * lw
  const diag = Math.hypot(W, H)

  // الحلقات: تتّسع بنسبةٍ ثابتة حتى تتجاوز أبعدَ زاوية، فتلتفّ كبارُها على حوافّ الصورة
  const far = Math.hypot(Math.max(gx, W - gx), Math.max(gy, H - gy)) * 2.1
  const rings = []
  for (let k = 0, d = gd * P.first; d < far; k++, d *= P.ratio) {
    const gold = k < P.gold.length
    const op = gold ? P.gold[k] : P.pearl * P.fade ** (k - P.gold.length)
    if (op < 0.03) break
    rings.push(ring(gx, gy, d, gold ? C.gold : C.pearl, op, P.stroke * u * Math.max(0.55, 1 - k * 0.04)))
  }
  // الصدى: حلقاتٌ قليلة مركزُها الزاويةُ المقابلة نفسُها، فلا يظهر منها إلا ربعُها
  const ox = kx ? 0 : W, oy = ky ? 0 : H
  const echo = P.echo.map(([s, op]) => ring(ox, oy, s * diag, C.pearl, op, P.stroke * u * 0.6)).join('')

  // الغشاء: ظلٌّ من الزاوية يذوب نحو الوسط
  const cxp = kx ? '100%' : '0%', cyp = ky ? '100%' : '0%'
  const veil = `radial-gradient(circle at ${cxp} ${cyp},${rgba(C.night, look.veil)} 0,${rgba(C.night, look.veil * 0.78)} ${f(diag * 0.22)}px,${rgba(C.night, look.veil * 0.4)} ${f(diag * 0.46)}px,${rgba(C.night, look.veil * 0.1)} ${f(diag * 0.66)}px,${rgba(C.night, 0)} ${f(diag * 0.82)}px)`
  const echoVeil = `radial-gradient(circle at ${kx ? '0%' : '100%'} ${ky ? '0%' : '100%'},${rgba(C.night, look.veil * 0.4)} 0,${rgba(C.night, 0)} ${f(diag * 0.34)}px)`
  // فُرجةُ الاسم: لا تمرّ الحلقاتُ تحت «إذكاء» (يسارَ الرمز)، فيُقرأ الاسمُ صافيًا
  const gap = { x: lx - 0.8 * u, y: ly - 0.8 * u, w: (EMBLEM_LEFT * lw) + 0.6 * u, h: lh + 1.6 * u }
  const lv = `type="linear" slope="${look.levels.slope}" intercept="${look.levels.intercept}"`

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${hex(C.night)}}
body{position:relative}
img.ph{position:absolute;inset:0;width:100%;height:100%;filter:url(#lv)}
.veil{position:absolute;inset:0;background:${veil},${echoVeil}}
.rings{position:absolute;inset:0;-webkit-mask-size:100% 100%;mask-size:100% 100%}
.logo{position:absolute;left:${f(lx)}px;top:${f(ly)}px;filter:drop-shadow(0 ${f(0.12 * u)}px ${f(0.5 * u)}px ${rgba(C.night, 0.35)})}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><filter id="lv" color-interpolation-filters="sRGB"><feComponentTransfer>
  <feFuncR ${lv}/><feFuncG ${lv}/><feFuncB ${lv}/></feComponentTransfer></filter></svg>

<img class="ph" src="${photo}" alt="">
<div class="veil"></div>
<svg class="rings" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${rings.join('')}${echo}</svg>
<div class="logo"><svg viewBox="${L.x} ${L.y} ${L.w} ${L.h}" width="${f(lw)}" height="${f(lh)}" role="img" aria-label="إذكاء" style="display:block">
  <path d="${LOGO.name}" fill="${hex(C.white)}"/><path d="${LOGO.dots}" fill="${hex(C.white)}"/>
  <path d="${LOGO.nameGold}" fill="${hex(C.gold)}"/><path d="${LOGO.diamond}" fill="${hex(C.gold)}"/></svg></div>

<script>
// قناعُ الحلقات: حيث الموضوعُ (حادٌّ في البؤرة) تخفت الحلقات، وتحت اسم الشعار فُرجة.
window.__ready = (async () => {
  const M = ${JSON.stringify(mask)}
  const bytes = Uint8Array.from(atob(M.data), (ch) => ch.charCodeAt(0))
  const small = new OffscreenCanvas(M.w, M.h), sg = small.getContext('2d')
  const id = sg.createImageData(M.w, M.h)
  for (let i = 0; i < bytes.length; i++) { id.data[i * 4 + 3] = 255 - Math.round(bytes[i] * 0.94) }
  sg.putImageData(id, 0, 0)
  const cv = document.createElement('canvas'); cv.width = ${W}; cv.height = ${H}
  const g = cv.getContext('2d')
  g.imageSmoothingQuality = 'high'
  g.drawImage(small, 0, 0, ${W}, ${H})
  g.globalCompositeOperation = 'destination-out'
  g.filter = 'blur(${f(0.6 * u)}px)'
  g.fillRect(${f(gap.x)}, ${f(gap.y)}, ${f(gap.w)}, ${f(gap.h)})
  const url = cv.toDataURL()
  const el = document.querySelector('.rings')
  el.style.webkitMaskImage = el.style.maskImage = 'url(' + url + ')'
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
})()
</script>
</body></html>`
}
