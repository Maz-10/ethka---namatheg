// ═══ المكوّنات الأوّليّة — كلُّ شريحةٍ تُبنى من هذه، ولا تكتب شريحةٌ لونًا أو مقاسًا من عندها ═══

import { C, FONT, TYPE, G, BRAND } from './brand.mjs'
import { glowData } from './glow.mjs'

// ── الأرقام: مشرقيّةٌ افتراضًا (افتراضُ المنصّة `numerals: 'ar'`)، وغربيّةٌ بقرارٍ في رأس المحتوى.
//    نقطةُ تحويلٍ واحدة يمرّ بها كلُّ نصّ — نظيرُ `AI()` في `app/src/lib/format.ts`.
let NUMERALS = 'ar'
export const setNumerals = (n) => { NUMERALS = n === 'en' ? 'en' : 'ar' }
const EAST = '٠١٢٣٤٥٦٧٨٩'
const east = (s) => s.replace(/(\d)\.(?=\d)/g, '$1٫').replace(/[0-9]/g, (d) => EAST[d]).replace(/%/g, '٪')
/** ما بين علامتَي \` يبقى كما كُتب (رمزُ لون، أمرٌ، مسار) وتُطرح العلامتان، ويُحاط بعلامتَي اتّجاهٍ
 *  من اليسار (‎U+200E‎) فلا تقفز «#» أو النقطةُ إلى الطرف الآخر في سطرٍ عربيّ. */
export const digits = (s) =>
  String(s ?? '').split('`').map((part, i) => (i % 2 ? '\u200E' + part + '\u200E' : NUMERALS !== 'ar' ? part : east(part))).join('')
/** تقديرُ عدد أسطر نصٍّ في صندوق — من مقاييس ثمانية المقيسة: ارتفاعُ السطر ١٫٢٥ من المقاس في العائلتين،
 *  ومتوسّطُ عرض الحرف العربيّ الموصول ٠٫٤٠ (Serif Display) و٠٫٤٣ (Sans) من المقاس، بهامش أمانٍ ٥٪.
 *  يُستعمل لإجراء ما تحت العنوان بقدر أسطره (لا لقصّ نصّ). */
export function lines(text, pt, wIn, { head = false } = {}) {
  const k = (head ? 0.40 : 0.43) * 1.05
  const clean = String(text ?? '').replace(/[\u064B-\u0652\u0670\u0640`]/g, '')
  const per = (wIn * 72) / (pt * k) // حروفٌ في السطر
  let n = 1, cur = 0
  for (const word of clean.split(/\s+/).filter(Boolean)) {
    const len = word.length + (cur ? 1 : 0)
    if (cur + len > per && cur) { n++; cur = word.length } else cur += len
  }
  return n
}
/** ارتفاعُ أسطرٍ بالبوصة — ١٫٢٥ من المقاس لكل سطر، مضروبًا في تباعد الأسطر. */
export const lineH = (pt, mult = 1) => (pt * 1.25 * mult) / 72

/** رقمُ ترتيبٍ بخانتين: ١ ← «٠١». */
export const ordinal = (n) => digits(String(n).padStart(2, '0'))

/** نصٌّ عربيّ: من اليمين، بلا حشوٍ داخليّ (فيلتقي حدُّه بحدود الأشكال)، وبالخطّ والحبر الافتراضيَّين.
 *  `latin: true` يُبقي الأرقامَ كما هي (بريدٌ وعنوانُ موقع). */
export function T(slide, text, o = {}) {
  const { latin, ...opts } = o
  const conv = latin ? (s) => String(s ?? '') : digits
  const runs = Array.isArray(text)
    ? text.map((r) => (typeof r === 'string' ? { text: conv(r) } : { ...r, text: conv(r.text) }))
    : conv(text)
  slide.addText(runs, {
    isTextBox: true, margin: 0, rtlMode: true, lang: BRAND.lang, align: 'right', valign: 'top',
    fontFace: FONT.body, color: C.ink, fontSize: TYPE.body, lineSpacingMultiple: 1.1, ...opts,
  })
}

/** المعيّن — مربّعٌ مدوَّر الرؤوس مُدارٌ ٤٥° (نصفُ قطر رأسه ٨٫٤٪ من ضلعه: مقياسُ الرمز نفسِه).
 *  `cx, cy` مركزُه و`d` قُطرُه الظاهر (من رأسٍ إلى رأس). */
export function diamond(slide, pres, cx, cy, d, { fill = C.gold, line, lineW = 1, name = 'معيّن' } = {}) {
  const s = d / Math.SQRT2
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: cx - s / 2, y: cy - s / 2, w: s, h: s, rotate: 45, rectRadius: s * 0.084,
    fill: fill ? { color: fill } : { type: 'none' },
    line: line ? { color: line, width: lineW } : { type: 'none' },
    objectName: name,
  })
}

/** بطاقة — سطحُ ورقٍ بخيطٍ شعريّ وظلٍّ ناعم (طبقةُ «الظلال أعمق وأنعم» في المنصّة). */
export function card(slide, pres, x, y, w, h, { fill = C.paper, line = C.line, shadow = true, name = 'بطاقة' } = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: G.radius,
    fill: { color: fill },
    line: line ? { color: line, width: 0.75 } : { type: 'none' },
    shadow: shadow ? { type: 'outer', color: '1E2228', blur: 16, offset: 4, angle: 90, opacity: 0.07 } : undefined,
    objectName: name,
  })
}

/** خيطٌ شعريّ أفقيّ — فاصلٌ بين صفوفٍ لا زينةٌ تحت عنوان. */
export function hair(slide, pres, x, y, w, color = C.line, width = 0.75) {
  slide.addShape(pres.shapes.LINE, { x, y, w, h: 0, line: { color, width }, objectName: 'خيط' })
}

/** علامةُ هويّةٍ متجهيّة (تُستبدل في التشطيب بأشكالٍ من `Logo.tsx`): `lockup` · `emblem` · `mark`. */
export function brand(slide, kind, { x, y, w, ink = null, gold = C.gold }) {
  slide.addShape('rect', {
    x, y, w, h: w / 3, fill: { color: 'FFFFFF', transparency: 100 }, line: { type: 'none' },
    objectName: `EK:${kind}:${ink ?? '-'}:${gold ?? '-'}`,
  })
}

/** توهّجٌ ذهبيّ دائريّ — «التوهّج الذهبيّ الخفيف» في المنصّة، صورةٌ شفّافة من `glow.mjs`. */
export function glow(slide, { cx, cy, r, color = C.gold, alpha = 16 }) {
  slide.addImage({ data: glowData(color, alpha), x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, objectName: 'توهّج', altText: '' })
}

/** الوسمُ فوق العنوان: معيّنٌ صغير ثم كلمةٌ ذهبيّة — على الفاتح والداكن. */
export function eyebrow(slide, pres, text, { y = G.eyebrowY, dark = false, x = G.mx, w = G.cw } = {}) {
  if (!text) return
  const d = 0.15
  diamond(slide, pres, x + w - d / 2, y + 0.155, d, { fill: C.gold })
  T(slide, text, { x, y, w: w - d - 0.12, h: 0.32, fontSize: TYPE.eyebrow, bold: true, color: dark ? C.goldNight : C.goldInk, valign: 'middle' })
}

/** التذييل: عنوانُ العرض المختصر يمينًا، ورقمُ الشريحة يسارًا بمعيّنه. */
export function footer(slide, pres, deck, n, { dark = false } = {}) {
  const y = G.footY
  T(slide, deck.meta.short || deck.meta.title, { x: G.mx + 2, y, w: G.cw - 2, h: 0.26, fontSize: TYPE.caption, color: dark ? C.pearl2 : C.ink2, valign: 'middle' })
  diamond(slide, pres, G.mx + 0.06, y + 0.13, 0.11, { fill: C.gold })
  T(slide, String(n), { x: G.mx + 0.2, y, w: 1, h: 0.26, fontSize: TYPE.caption, bold: true, color: dark ? C.pearl : C.ink, align: 'left', valign: 'middle', rtlMode: false })
}

/** صيغةُ أرقام الرسوم: بالأرقام المشرقيّة إن كانت هي المختارة (رمزُ اللغة ‎[$-2000401]‎ يطلب أشكالَ الأرقام
 *  العربيّة من محرّك الرسوم نفسِه)، وعلامةُ النسبة العربيّة داخل الصيغة. */
export const numFmt = (code = '#,##0') =>
  NUMERALS === 'ar' ? '[$-2000401]' + code.replace(/%/g, '٪') : code
