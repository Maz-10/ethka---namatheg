// ═══ الإطار — المقاساتُ الثلاثة والموجة والطبقات ═══
// كلُّ لونٍ من `../عروض/src/brand.mjs` وكلُّ شكلٍ من الشعار نفسِه (`identity.mjs`) — لا قيمةَ مُرتجلة هنا.
// الطبقاتُ من الأسفل: الصورة (مقتطَعةً ومصحَّحة) ← تظليلُ الأطراف ← تعتيمٌ فوق الموجة بقدر سطوعها ←
// خطوطُ التموّج ← لوحُ الليل بحافّته الموجيّة ← حقلُ المعيّنات الخافت ← المعيّنُ الذهبيّ على القمّة ← الكتابة.

import { pathToFileURL } from 'node:url'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { C } from '../../عروض/src/brand.mjs'
import { LOGO } from '../../عروض/src/identity.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const FONTS = pathToFileURL(resolve(HERE, '../../عروض/fonts')).href + '/'
const hex = (h) => '#' + h
const rgba = (h, a) => `rgba(${[0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',')},${a})`
const f = (n) => +n.toFixed(2)

/** المقاسات — بكسل CSS، و`dpr` كثافةُ التصيير (المخرجُ = المقاس × الكثافة).
 *  `wave.y` خطُّ الموجة من الارتفاع، و`A` سعتُها، و`k` عددُ أمواجها في العرض، و`crest` موضعُ قمّتها
 *  (العربيّةُ تبدأ من اليمين فالقمّةُ يمينًا فوق العنوان). */
export const FORMATS = {
  'أفقي': {
    W: 1600, H: 900, dpr: 1.5, use: 'إكس · لينكدإن · واتساب',
    wave: { y: 0.765, A: 24, k: 1, crest: 0.82 },
    pad: 64, safeTop: 0, safeBottom: 0,
    type: { eyebrow: 19, head: 40, sub: 0, meta: 18 }, headLines: 1, subLines: 0, logo: 196,
    row: true, // الكتابةُ يمينًا والشعارُ يسارًا في صفٍّ واحد
  },
  'عمودي': {
    W: 1080, H: 1350, dpr: 1, use: 'إنستغرام · لينكدإن (المنشور)',
    wave: { y: 0.67, A: 30, k: 1, crest: 0.8 },
    pad: 72, safeTop: 0, safeBottom: 0,
    type: { eyebrow: 21, head: 50, sub: 23, meta: 19 }, headLines: 2, subLines: 2, logo: 156,
  },
  'قصة': {
    W: 1080, H: 1920, dpr: 1, use: 'قصص إنستغرام · سناب شات',
    wave: { y: 0.515, A: 34, k: 1, crest: 0.8 }, center: true,
    pad: 84, safeTop: 220, safeBottom: 250, // ما تغطّيه واجهةُ القصص أعلى وأسفل
    type: { eyebrow: 27, head: 72, sub: 31, meta: 24 }, headLines: 3, subLines: 3, logo: 210,
  },
}

/** الموجة: موجةٌ أساسيّة وتوافقيّةٌ خفيفة تكسر انتظامَها، وقمّتُها حيث طُلبت. */
export function wave(F) {
  const { W, H } = F
  const { y, A, k, crest } = F.wave
  const y0 = y * H, a2 = 0.22, k2 = 2.15
  const p1 = -Math.PI / 2 - 2 * Math.PI * k * crest
  const p2 = -Math.PI / 2 - 2 * Math.PI * k * k2 * crest // التوافقيّةُ في طورها عند القمّة فلا تزحزحها
  const fy = (x) => y0 + (A * (Math.sin((2 * Math.PI * k * x) / W + p1) + a2 * Math.sin((2 * Math.PI * k * k2 * x) / W + p2))) / (1 + a2)
  const N = 200
  const pts = []
  for (let i = 0; i <= N; i++) { const x = -4 + ((W + 8) * i) / N; pts.push([x, fy(x)]) }
  let top = pts[0], bottom = pts[0]
  for (const p of pts) { if (p[1] < top[1]) top = p; if (p[1] > bottom[1]) bottom = p }
  const d = 'M' + pts.map(([x, yy]) => `${f(x)} ${f(yy)}`).join(' L')
  /** موجةٌ موازية فوق الحافّة بمسافة `up`، تتسطّح بقدر `damp` — فتبدو الخطوطُ تموّجًا ينتشر ويهدأ. */
  const echo = (up, damp) => 'M' + pts.map(([x, yy]) => `${f(x)} ${f(y0 - up + (yy - y0) * damp)}`).join(' L')
  return { fy, d, echo, crest: { x: crest * W, y: fy(crest * W) }, top: top[1], bottom: bottom[1] }
}

/** خانةُ الصورة وجزؤها الظاهر — تنتهي الصورةُ تحت أخفض نقطةٍ في الموجة بقليل. */
export function photoBox(F) {
  const wv = wave(F)
  const h = Math.ceil(wv.bottom + 6)
  return { w: F.W, h, aspect: F.W / h, vis: { x: 0, y: 0, w: 1, h: wv.top / h } }
}

/** المعيّن — مسارُ الشعار نفسُه، رمزًا يُستدعى. */
const b = LOGO.box.mark
const DIAMOND_SYMBOL = `<symbol id="dm" viewBox="${b.x} ${b.y} ${b.w} ${b.h}"><path d="${LOGO.diamond}"/></symbol>`
const L = LOGO.box.lockup
const LOCKUP = (w) => `<svg viewBox="${L.x} ${L.y} ${L.w} ${L.h}" width="${w}" height="${f((w * L.h) / L.w)}" role="img" aria-label="إذكاء" style="display:block">
  <path d="${LOGO.name}" fill="${hex(C.white)}"/><path d="${LOGO.dots}" fill="${hex(C.white)}"/>
  <path d="${LOGO.nameGold}" fill="${hex(C.gold)}"/><path d="${LOGO.diamond}" fill="${hex(C.gold)}"/></svg>`

/** حقلُ المعيّنات: صفوفٌ تتبع الموجةَ تحت حافّتها، تخفت مع البعد عن الطرف الأيسر وعن الحافّة —
 *  «المجمعُ الساكن» همسًا في الخلفيّة لا زخرفًا. */
function field(F, wv) {
  const s = F.W * 0.0042, gx = F.W * 0.0135, gy = gx * 0.62, rows = 7, reach = 0.4 * F.W
  let out = ''
  for (let r = 1; r <= rows; r++) {
    for (let x = gx / 2 + (r % 2 ? gx / 2 : 0); x < reach; x += gx) {
      const y = wv.fy(x) + r * gy + gy * 0.4
      const op = 0.16 * Math.pow(1 - x / reach, 1.4) * Math.pow(1 - (r - 1) / rows, 1.2)
      if (op < 0.008) continue
      out += `<use href="#dm" x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${f(s)}" height="${f(s)}" opacity="${f(op * 1000) / 1000}"/>`
    }
  }
  return `<g fill="${hex(C.pearl)}">${out}</g>`
}

/** تنضيدُ النصّ: (١) خطُّ ثمانية يُطبق المسافةَ قبل الأرقام المشرقيّة («نوفمبر٢٠٢٦») فتُبدَّل بمسافتين رقيقتين
 *  تُريان مسافةً واحدة؛ (٢) السطرُ الجديد في ملف المحتوى «موضعُ كسرٍ مفضَّل» لا يُكسر إلا إن التفّ السطرُ أصلًا. */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const typeset = (s) => esc(s || '').replace(/ (?=[٠-٩])/g, '\u2009\u2009').replace(/\s*\n\s*/g, ' <span class="br"></span>')

/** الأرقامُ المشرقيّة. */
export const ar = (s) => String(s).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

/** الصفحةُ كاملة لمقاسٍ واحد. `photo` مسارُ الصورة، و`cut` نافذةُ الاقتطاع، و`look` قراراتُ الضوء والتعتيم. */
export function html(F, { photo, cut, look, text, count }) {
  const { W, H, pad } = F
  const wv = wave(F)
  const box = photoBox(F)
  // الصورةُ تُكبَّر حتى تملأ نافذةُ الاقتطاع الخانةَ، ثم تُزاح
  const iw = box.w / cut.w, ih = box.h / cut.h
  const ix = -cut.x * iw, iy = -cut.y * ih
  const { crest } = wv
  const dm = F.W * 0.0175 // قطرُ المعيّن الذهبيّ
  const gap = Math.min(F.W, F.H) * 0.021 // تباعدُ خطوط التموّج
  const ripple = [0.9, 0.6, 0.34, 0.16].map((op, i) =>
    `<path d="${wv.echo((i + 1) * gap * (1 + i * 0.18), 1 - (i + 1) * 0.16)}" stroke="url(#rg)" stroke-opacity="${op}" stroke-width="${f(Math.min(F.W, F.H) * 0.0019)}" fill="none"/>`).join('')
  const panelD = `${wv.d} L${W + 4} ${H + 4} L-4 ${H + 4} Z`
  const scrimTop = wv.top - H * 0.24
  const T = F.type
  const panelTop = wv.bottom + (F.row ? H * 0.028 : H * 0.03)

  const eyebrow = typeset(text.eyebrow)
  const head = typeset(text.head)
  const sub = F.subLines ? typeset(text.sub) : ''
  const meta = text.meta.map((m) => `<span>${typeset(m)}</span>`).join(`<i class="sep"><svg viewBox="${b.x} ${b.y} ${b.w} ${b.h}"><path d="${LOGO.diamond}" fill="${hex(C.gold)}"/></svg></i>`)
  const counter = count && count.total > 1 ? `<div class="count" style="background:${rgba(C.night, look.badge)}">${ar(String(count.n).padStart(2, '0'))}<span> / ${ar(String(count.total).padStart(2, '0'))}</span></div>` : ''

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:TS;src:url(${FONTS}thmanyahsans-Regular.otf);font-weight:400}
@font-face{font-family:TS;src:url(${FONTS}thmanyahsans-Medium.otf);font-weight:500}
@font-face{font-family:TS;src:url(${FONTS}thmanyahsans-Bold.otf);font-weight:700}
@font-face{font-family:TD;src:url(${FONTS}thmanyahserifdisplay-Regular.otf);font-weight:400}
@font-face{font-family:TD;src:url(${FONTS}thmanyahserifdisplay-Medium.otf);font-weight:500}
@font-face{font-family:TD;src:url(${FONTS}thmanyahserifdisplay-Bold.otf);font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${hex(C.night)}}
body{position:relative;font-family:TS;color:${hex(C.pearl)};-webkit-font-smoothing:antialiased}
.ph{position:absolute;left:0;top:0;width:${box.w}px;height:${box.h}px;overflow:hidden}
.ph img{position:absolute;left:${f(ix)}px;top:${f(iy)}px;width:${f(iw)}px;height:${f(ih)}px;filter:url(#lv)}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse 75% 80% at 50% 42%,transparent 55%,${rgba(C.night, 0.34)} 100%)}
.scrim{position:absolute;left:0;right:0;top:${f(scrimTop)}px;height:${f(box.h - scrimTop)}px;background:linear-gradient(to bottom,${rgba(C.night, 0)} 0%,${rgba(C.night, look.scrim * 0.55)} 55%,${rgba(C.night, look.scrim)} 100%)}
.top{position:absolute;left:0;right:0;top:0;height:${F.safeTop * 1.2}px;background:linear-gradient(to bottom,${rgba(C.night, 0.32)},${rgba(C.night, 0)})}
svg.art{position:absolute;inset:0}
.panel{position:absolute;right:${pad}px;left:${pad}px;top:${f(panelTop)}px;bottom:${F.safeBottom || pad * (F.row ? 0.62 : 0.8)}px;display:flex;${F.row ? 'flex-direction:row;align-items:center;justify-content:space-between;gap:48px' : 'flex-direction:column'}}
.txt{display:flex;flex-direction:column;min-width:0;${F.row ? 'flex:1' : ''}${F.center ? 'flex:1;justify-content:center;padding-bottom:4%' : ''}}
.br{display:none}.br.on{display:block}
.eyebrow{font-weight:500;font-size:${T.eyebrow}px;line-height:1.5;color:${hex(C.goldNight)}}
.head{font-family:TD;font-weight:500;font-size:${T.head}px;line-height:1.32;color:${hex(C.pearl)};margin-top:${f(T.head * 0.12)}px;text-wrap:balance}
.sub{font-weight:400;font-size:${T.sub}px;line-height:1.6;color:${hex(C.pearl2)};margin-top:${f(T.sub * 0.55)}px;text-wrap:balance}
.meta{display:flex;align-items:center;flex-wrap:wrap;gap:0 ${f(T.meta * 0.75)}px;font-size:${T.meta}px;line-height:1.6;color:${hex(C.pearl2)}}
.meta .sep{display:inline-block;width:${f(T.meta * 0.42)}px;height:${f(T.meta * 0.42)}px}
.meta .sep svg{display:block;width:100%;height:100%}
.foot{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;${F.row ? '' : `margin-top:auto;padding-top:${f(T.meta * 1.1)}px;border-top:1px solid ${rgba(C.pearl, 0.12)}`}}
.row-meta{margin-top:${f(T.meta * 0.45)}px}
.count{position:absolute;left:${pad}px;top:${F.safeTop ? F.safeTop + 10 : pad * 0.7}px;padding:${f(T.meta * 0.32)}px ${f(T.meta * 0.8)}px;border-radius:999px;font-size:${T.meta}px;line-height:1.4;color:${hex(C.pearl)};backdrop-filter:blur(10px);border:1px solid ${rgba(C.pearl, 0.16)}}
.count span{color:${hex(C.pearl2)}}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs>
  <filter id="lv" color-interpolation-filters="sRGB"><feComponentTransfer>
    <feFuncR type="linear" slope="${look.levels.slope}" intercept="${look.levels.intercept}"/>
    <feFuncG type="linear" slope="${look.levels.slope}" intercept="${look.levels.intercept}"/>
    <feFuncB type="linear" slope="${look.levels.slope}" intercept="${look.levels.intercept}"/>
  </feComponentTransfer></filter>
</defs></svg>

<div class="ph"><img src="${photo}" alt=""><div class="vig"></div><div class="scrim"></div>${F.safeTop ? '<div class="top"></div>' : ''}</div>

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
      <stop offset="0" stop-color="${hex(C.gold)}" stop-opacity=".12"/>
      <stop offset="${f(crest.x / W)}" stop-color="${hex(C.gold)}" stop-opacity="1"/>
      <stop offset="1" stop-color="${hex(C.gold)}" stop-opacity=".3"/>
    </linearGradient>
    <radialGradient id="glow" cx="${f(crest.x)}" cy="${f(crest.y)}" r="${f(dm * 4.2)}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${hex(C.gold)}" stop-opacity=".42"/><stop offset=".4" stop-color="${hex(C.gold)}" stop-opacity=".1"/><stop offset="1" stop-color="${hex(C.gold)}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g>${ripple}</g>
  <path d="${panelD}" fill="${hex(C.night)}"/>
  ${field(F, wv)}
  <path d="${wv.d}" stroke="url(#eg)" stroke-width="${f(F.W * 0.0014)}" fill="none"/>
  <circle cx="${f(crest.x)}" cy="${f(crest.y)}" r="${f(dm * 4.2)}" fill="url(#glow)"/>
  <circle cx="${f(crest.x)}" cy="${f(crest.y)}" r="${f(dm * 1.05)}" fill="none" stroke="${hex(C.gold)}" stroke-opacity=".7" stroke-width="${f(F.W * 0.0009)}"/>
  <use href="#dm" x="${f(crest.x - dm / 2)}" y="${f(crest.y - dm / 2)}" width="${f(dm)}" height="${f(dm)}" fill="${hex(C.gold)}"/>
</svg>

${counter}

<div class="panel">
  <div class="txt">
    <div class="eyebrow">${eyebrow}</div>
    <div class="head" data-fit="${F.headLines}">${head}</div>
    ${sub ? `<div class="sub" data-fit="${F.subLines}">${sub}</div>` : ''}
    ${F.row ? `<div class="meta row-meta">${meta}</div>` : ''}
  </div>
  ${F.row ? `<div class="logo">${LOCKUP(F.logo)}</div>` : `<div class="foot"><div class="meta">${meta}</div><div class="logo">${LOCKUP(F.logo)}</div></div>`}
</div>
</body></html>`
}

/** يُشغَّل في الصفحة بعد تحميل الخطوط: يصغّر كلَّ نصٍّ فاض عن عدد أسطره (حتى ٧٢٪ من مقاسه)،
 *  ويعيد ما بقي فائضًا — فلا يُسلَّم مقاسٌ بنصٍّ مقصوص. */
export function fitInPage() {
  const over = []
  for (const el of document.querySelectorAll('[data-fit]')) {
    const max = +el.dataset.fit
    let fs = parseFloat(getComputedStyle(el).fontSize)
    const min = fs * 0.72
    const lines = () => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))
    // موضعُ الكسر المفضَّل: يُفعَّل إن التفّ النصُّ على كل حال، ويُترك إن زاد الأسطر
    const brs = el.querySelectorAll('.br')
    if (brs.length && lines() > 1) {
      const before = lines()
      brs.forEach((x) => x.classList.add('on'))
      if (lines() > before) brs.forEach((x) => x.classList.remove('on'))
    }
    while (lines() > max && fs > min) { fs -= 1; el.style.fontSize = fs + 'px' }
    if (lines() > max) over.push(el.className + ': ' + el.textContent.trim())
  }
  // والكتلةُ كلُّها لا تتجاوز لوحَها
  const p = document.querySelector('.panel')
  if (p && p.scrollHeight > p.clientHeight + 1) over.push('panel: ' + (p.scrollHeight - p.clientHeight) + 'px')
  return over
}
