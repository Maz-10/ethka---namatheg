// ═══ المتن والتذهيب — الصورةُ نقيّة وعليها توقيعٌ صغير ═══
// «توقيع»: الصورةُ كما التُقطت كاملةً، وعليها الشعارُ صغيرًا في أهدأ زواياها — لا موجةَ ولا زخرف؛ الصورةُ هي المحتوى.
// «تذهيب»: الصورةُ نفسُها بمعالجةٍ لونيّة من الهويّة — ظلالُها ليل، وأوساطُها ذهب، وأضواؤها كريميّ — تُعرف بها
//   منشوراتُ إذكاء ولو حُذف الشعار. (الإلهام: «Colorizer» لكولينز في هويّة سبوتيفاي: معالجةٌ آليّة تجعل أيَّ صورةٍ منّا.)
// الذكاء: الزاويةُ من smart.mjs؛ وحبرُ الشعار بحسب سطوع موضعه — أبيضُ بظلٍّ خفيف على الداكن،
//   وأسودُ الملف على الفاتح (كما يقضي ملفُّ الهويّة) — فلا يضيع التوقيعُ على أيّ صورة.

import { C, LOGO, hex, rgba, f, lockup, head } from './common.mjs'
import { regionMean } from './smart.mjs'

const P = {
  logo: 14,      // عرضُ الشعار (من وحدة الضلع الأقصر)
  margin: 4.6,   // بُعدُه عن حافّتَي الزاوية
  light: 0.6,    // سطوعُ موضع الشعار الذي ينقلب عنده الحبرُ أسود
}

const ch = (h) => [0, 2, 4].map((i) => +(parseInt(h.slice(i, i + 2), 16) / 255).toFixed(4))

/** مرشّحُ التذهيب: تباينٌ خفيف، ثم السطوعُ على تدرّج ليل ← ذهب ← كريميّ. */
function goldFilter(lv) {
  const stops = [C.night, C.night, C.gold, C.cream].map(ch)
  const table = (i) => stops.map((s) => s[i]).join(' ')
  const lin = `type="linear" slope="${f(lv.slope * 1.12)}" intercept="${f(lv.intercept - 0.06)}"`
  return `<svg width="0" height="0" style="position:absolute"><filter id="gold" color-interpolation-filters="sRGB">
    <feComponentTransfer><feFuncR ${lin}/><feFuncG ${lin}/><feFuncB ${lin}/></feComponentTransfer>
    <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"/>
    <feComponentTransfer><feFuncR type="table" tableValues="${table(0)}"/><feFuncG type="table" tableValues="${table(1)}"/><feFuncB type="table" tableValues="${table(2)}"/></feComponentTransfer>
  </filter></svg>`
}

function make(gold) {
  return function html({ photo, pg, c, look, an }) {
    const { W, H, u } = pg
    const [kx, ky] = c.k
    const lw = P.logo * u, lh = (lw * LOGO.box.lockup.h) / LOGO.box.lockup.w, m = P.margin * u
    const lx = kx ? W - m - lw : m, ly = ky ? H - m - lh : m
    // سطوعُ موضع الشعار نفسِه (مع هامشٍ حوله) — بعد التذهيب يبقى ترتيبُ السطوع كما هو
    const lum = regionMean(an, (lx - m / 2) / W, (ly - m / 2) / H, (lw + m) / W, (lh + m) / H)
    const dark = !gold && lum > P.light
    const shade = dark ? 0 : +Math.min(0.55, 0.22 + Math.max(0, lum - 0.25) * 0.9).toFixed(3)
    look.ink = dark ? 'أسود' : 'أبيض'; look.shade = shade; look.spot = +lum.toFixed(3)

    return head(pg, look, `
img.ph{${gold ? 'filter:url(#gold)' : ''}}
.shade{position:absolute;left:${f(lx - lw * 0.45)}px;top:${f(ly - lh * 1.1)}px;width:${f(lw * 1.9)}px;height:${f(lh * 3.2)}px;
  background:radial-gradient(ellipse closest-side,${rgba(C.night, shade)} 0,${rgba(C.night, shade * 0.5)} 55%,${rgba(C.night, 0)} 100%)}
.logo{position:absolute;left:${f(lx)}px;top:${f(ly)}px}`) + `
${gold ? goldFilter(look.levels) : ''}
<img class="ph" src="${photo}" alt="">
${shade ? '<div class="shade"></div>' : ''}
<div class="logo">${lockup(lw, { ink: dark ? C.logoInk : C.white })}</div>
</body></html>`
  }
}

export const sign = make(false)
export const goldTone = make(true)
