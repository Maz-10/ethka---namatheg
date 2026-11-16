// ═══ التوقيع (المعتمد) والتذهيب — الصورةُ نقيّة، وفي أسفلها توقيعُ إذكاء ═══
// «توقيع»: الصورةُ كما التُقطت كاملةً بدقّتها. ومن أسفلها ظلٌّ بلون الليل يتلاشى صعودًا، وعليه سطرُ التوقيع:
//   الشعارُ يمينًا (حيث تبدأ القراءة) ورابطُ «Ethka.sa» يسارًا، على خطّ أساسٍ واحد مع اسم الشعار.
//   وحبرُهما لؤلؤيّ (`pearl` — نصُّ الهويّة على الليل) لا أبيضُ محض، والذهبُ ذهبُ الشعار.
// «تذهيب»: التوقيعُ نفسُه على الصورة بمعالجةٍ لونيّة من الهويّة — ظلالُها ليل، وأوساطُها ذهب، وأضواؤها كريميّ.
//   (الإلهام: «Colorizer» لكولينز في هويّة سبوتيفاي.)
// الذكاء: شدّةُ الظلّ بحسب سطوع أسفل الصورة — يشتدّ على الفاتح ويخفّ على الداكن، فيُقرأ التوقيعُ على كلّ صورة
//   ولا يُثقل الصورةَ الداكنة. والرابطُ يُضبط على خطّ أساس الاسم بالقياس في الصفحة لا بالتقدير.

import { C, LOGO, hex, rgba, f, lockup, head } from './common.mjs'
import { regionMean } from './smart.mjs'

const FONTS = new URL('../../عروض/fonts/', import.meta.url).href

const P = {
  logo: 14,      // عرضُ الشعار (من وحدة الضلع الأقصر)
  margin: 4.6,   // بُعدُ التوقيع عن حافّتَي الصورة الجانبيّة والسفلى
  fade: 0.36,    // ارتفاعُ الظلّ من ارتفاع الصورة (يبدأ من الأسفل ويتلاشى صعودًا)
  url: 'Ethka.sa',
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
  return function html({ photo, pg, look, an }) {
    const { W, H, u } = pg
    const L = LOGO.box.lockup
    const lw = P.logo * u, lh = (lw * L.h) / L.w, m = P.margin * u, s = lh / L.h
    const lx = W - m - lw, ly = H - m - lh
    const base = ly + (0 - L.y) * s // خطُّ أساس الاسم في الشعار (الصفرُ في فضاء ملفّه)
    const body = 425 * s            // جسمُ حروف الاسم فوق خطّ الأساس — تُقاس عليه حروفُ الرابط الكبيرة
    const fs = f(body / 0.7)        // ارتفاعُ الحرف الكبير في ثمانية ≈ ٠٫٧ من المقاس

    // شدّةُ الظلّ: سطوعُ الثلث الأسفل من الصورة
    const lum = regionMean(an, 0, 1 - P.fade, 1, P.fade)
    const a = +Math.min(0.88, Math.max(0.58, 0.68 + (lum - 0.3) * 0.7)).toFixed(3)
    look.shade = a; look.spot = +lum.toFixed(3)

    return head(pg, look, `
@font-face{font-family:TS;src:url(${FONTS}thmanyahsans-Regular.otf)}
img.ph{${gold ? 'filter:url(#gold)' : ''}}
.shade{position:absolute;left:0;right:0;bottom:0;height:${f(P.fade * 100)}%;
  background:linear-gradient(to top,${rgba(C.night, a)} 0%,${rgba(C.night, a * 0.72)} 22%,${rgba(C.night, a * 0.38)} 50%,${rgba(C.night, a * 0.12)} 78%,${rgba(C.night, 0)} 100%)}
.logo{position:absolute;left:${f(lx)}px;top:${f(ly)}px}
.url{position:absolute;left:${f(m)}px;top:0;font-family:TS;font-weight:400;font-size:${fs}px;line-height:1;letter-spacing:.01em;color:${hex(C.pearl)};direction:ltr;white-space:nowrap}
.url i{display:inline-block;width:0;height:0}`) + `
${gold ? goldFilter(look.levels) : ''}
<img class="ph" src="${photo}" alt="">
<div class="shade"></div>
<div class="logo">${lockup(lw, { ink: C.pearl })}</div>
<div class="url">${P.url}<i></i></div>
<script>
// خطُّ الأساس بالقياس: علامةٌ صفريّة في آخر السطر تقع على خطّ أساسه، فيُزاح الرابطُ حتى يلتقي بخطّ أساس الاسم
window.__ready = document.fonts.ready.then(() => {
  const el = document.querySelector('.url'), mark = el.querySelector('i')
  el.style.top = (${f(base)} - mark.getBoundingClientRect().top) + 'px'
})
</script>
</body></html>`
  }
}

export const sign = make(false)
export const goldTone = make(true)
