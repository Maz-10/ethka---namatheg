// ═══ التخطيطات — الإطارُ الثابت لكل نوعِ شريحة ═══
// كلُّ تخطيطٍ يحمل خلفيّتَه وزخرفتَه الثابتة (الشعار والرمز والتوهّج والمعيّن) وخاناتِ نصّه بأنماطها.
// هذه هي «الهيئة» نفسُها: تظهر في معرض التخطيطات داخل باوربوينت بأسمائها العربية، فمن أراد شريحةً
// جديدةً يدويًّا اختار تخطيطها فوجد كلَّ شيءٍ في موضعه. والمولِّدُ يملأ الخاناتِ نفسَها بأسمائها.

import { C, FONT, TYPE, G } from './brand.mjs'
import { heightOf } from './identity.mjs'
import { glowData } from './glow.mjs'

/** أسماءُ التخطيطات — تظهر للمستخدم في باوربوينت. */
export const L = {
  COVER: 'إذكاء ◆ غلاف',
  SECTION: 'إذكاء ◆ فاصل قسم',
  TITLE: 'إذكاء ◆ عنوان',
  CONTENT: 'إذكاء ◆ عنوان ومتن',
  STATEMENT: 'إذكاء ◆ رسالة محوريّة',
  QUOTE: 'إذكاء ◆ اقتباس',
  IMAGE: 'إذكاء ◆ صورة ونصّ',
  CLOSING: 'إذكاء ◆ ختام',
  BLANK: 'إذكاء ◆ فارغ فاتح',
  BLANK_DARK: 'إذكاء ◆ فارغ داكن',
}

/** عددُ التخطيطات في الملفّ: ما في `L` وتخطيطُ القالب الرئيسيّ نفسُه («ورقة بيضاء» — يُسمّى في التشطيب). */
export const LAYOUT_COUNT = Object.keys(L).length + 1

/** هندسةُ الزخرفة المشتركة — يقرؤها التخطيطُ والشريحةُ معًا فلا يفترقان. */
export const GEO = {
  // الرمزُ الكبير في الغلاف والختام: النقطتان بحبرٍ خافت على الليل، والمعيّنُ بذهبه
  emblem: { x: 0.95, w: 4.5, get h() { return heightOf('emblem', this.w) }, get y() { return (G.H - this.h) / 2 } },
  // الشعارُ في الغلاف والختام
  lockup: { w: 1.8, get x() { return G.right - this.w }, y: 0.66 },
  // عمودُ النصّ في الغلاف والختام
  coverText: { x: 6.2, get w() { return G.right - this.x } },
  // عمودُ النصّ في شريحة الصورة
  imageText: { x: 6.75, get w() { return G.right - this.x } },
  imageW: 6.1,
  // مواضعُ الكتلة النصّيّة في الغلاف والفاصل والختام — والمولِّدُ يُجري ما بعد العنوان تحته بقدر أسطره
  cover: { eyebrowY: 2.45, titleY: 2.87 },
  section: { titleY: 2.86 },
  closing: { eyebrowY: 1.95, titleY: 2.38 },
}
// مركزُ المعيّن الذهبيّ في الرمز (نسبةٌ من صندوق `emblem` في Logo.tsx: x ٠٫٥ · y ٠٫٢٨٩٥)
const goldCenter = () => ({ cx: GEO.emblem.x + GEO.emblem.w * 0.5, cy: GEO.emblem.y + GEO.emblem.h * 0.2895 })

// ── أدواتُ التعريف
const marker = (kind, ink, gold, x, y, w) => ({
  rect: { x, y, w, h: w / 3, fill: { color: 'FFFFFF', transparency: 100 }, line: { type: 'none' }, objectName: `EK:${kind}:${ink ?? '-'}:${gold ?? '-'}` },
})
const glowM = (cx, cy, r, alpha, color = C.gold) => ({
  image: { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, data: glowData(color, alpha), objectName: 'توهّج', altText: '' },
})
const ph = (name, type, box, style, prompt) => ({
  placeholder: {
    options: { name, type, ...box, margin: 0, align: 'right', valign: 'top', rtlMode: true, lang: 'ar-SA', fontFace: FONT.body, ...style },
    text: prompt,
  },
})
const eyebrowMark = (x, y, d, gold = C.gold) => marker('mark', null, gold, x - d, y + 0.155 - d / 2, d)
const titleBlock = ({ x = G.mx, w = G.cw, dark = false } = {}) => [
  eyebrowMark(x + w, G.eyebrowY, 0.15),
  ph('eyebrow', 'body', { x, y: G.eyebrowY, w: w - 0.27, h: 0.32 }, { fontSize: TYPE.eyebrow, bold: true, color: dark ? C.goldNight : C.goldInk, valign: 'middle' }, 'وسمُ القسم'),
  ph('title', 'title', { x, y: G.titleY, w, h: G.titleH }, { fontFace: FONT.head, fontSize: TYPE.title, bold: true, color: dark ? C.pearl : C.ink, valign: 'middle', lineSpacingMultiple: 0.95 }, 'عنوانُ الشريحة: استنتاجٌ في سطرٍ واحد'),
  ph('lead', 'body', { x, y: G.leadY, w, h: 0.5 }, { fontSize: 17, color: dark ? C.pearl2 : C.ink2, lineSpacingMultiple: 1.1 }, 'سطرُ سياقٍ يشرح العنوان ولا ينافسه'),
]

/** سجلُّ الخانات لكل تخطيط: رقمُها في الملف (‎100 + موضعها بين عناصر التخطيط — قاعدةُ pptxgenjs‎) ومرساتُها
 *  الرأسيّة — يكتبها التشطيب في التخطيط نفسِه، لأن pptxgenjs يُسقطها فيرث المستخدمُ اليدويّ حشوًا ومرساةً غيرَ ما صُمّم. */
export const PH_REG = {}
const ANCHOR = { top: 't', middle: 'ctr', bottom: 'b' }

export function defineLayouts(pres) {
  const define = (spec) => {
    PH_REG[spec.title] = spec.objects.flatMap((o, i) => (o.placeholder ? [{ idx: 100 + i, anchor: ANCHOR[o.placeholder.options.valign ?? 'top'] }] : []))
    pres.defineSlideMaster(spec)
  }
  const e = GEO.emblem, lk = GEO.lockup, ct = GEO.coverText, gc = goldCenter()

  define({
    title: L.COVER,
    background: { color: C.night },
    objects: [
      glowM(gc.cx, gc.cy, 3.1, 15),
      marker('emblem', C.night3, C.gold, e.x, e.y, e.w),
      marker('lockup', C.white, C.gold, lk.x, lk.y, lk.w),
      eyebrowMark(G.right, GEO.cover.eyebrowY, 0.15),
      ph('eyebrow', 'body', { x: ct.x, y: GEO.cover.eyebrowY, w: ct.w - 0.27, h: 0.32 }, { fontSize: TYPE.eyebrow, bold: true, color: C.goldNight, valign: 'middle' }, 'نوعُ العرض · المناسبة'),
      ph('title', 'title', { x: ct.x, y: GEO.cover.titleY, w: ct.w, h: 1.95 }, { fontFace: FONT.head, fontSize: TYPE.display, bold: true, color: C.pearl, lineSpacingMultiple: 0.95 }, 'عنوانُ العرض في سطرٍ أو سطرين'),
      ph('lead', 'body', { x: ct.x, y: 4.85, w: ct.w, h: 0.85 }, { fontSize: TYPE.lead, color: C.pearl2, lineSpacingMultiple: 1.15 }, 'سطرُ السياق: لماذا هذا العرض، ولمن'),
      ph('meta', 'body', { x: ct.x, y: 6.42, w: ct.w, h: 0.36 }, { fontSize: 12.5, color: C.pearl2, valign: 'middle' }, 'المقدِّم  ·  الجهة  ·  التاريخ'),
    ],
  })

  define({
    title: L.SECTION,
    background: { color: C.night },
    objects: [
      glowM(10.9, 1.75, 3.0, 9),
      marker('emblem', C.night2, C.night3, -1.05, 3.05, 6.6),
      ph('number', 'body', { x: 5.2, y: 0.78, w: G.right - 5.2, h: 1.85 }, { fontFace: FONT.head, fontSize: TYPE.numeral, bold: true, color: C.gold, valign: 'bottom', lineSpacingMultiple: 0.9 }, '٠١'),
      ph('title', 'title', { x: 4.4, y: GEO.section.titleY, w: G.right - 4.4, h: 1.3 }, { fontFace: FONT.head, fontSize: TYPE.section, bold: true, color: C.pearl, lineSpacingMultiple: 0.95 }, 'عنوانُ القسم'),
      ph('lead', 'body', { x: 5.6, y: 4.3, w: G.right - 5.6, h: 1.1 }, { fontSize: TYPE.lead, color: C.pearl2, lineSpacingMultiple: 1.15 }, 'جملةٌ تقريريّة تقول ما سيثبته هذا القسم'),
    ],
  })

  define({ title: L.TITLE, background: { color: C.cream }, objects: titleBlock() })

  define({
    title: L.CONTENT,
    background: { color: C.cream },
    objects: [
      ...titleBlock(),
      ph('body', 'body', { x: G.mx, y: G.bodyY, w: G.cw, h: G.bodyBottom - G.bodyY }, { fontSize: 17, color: C.ink, lineSpacingMultiple: 1.15, paraSpaceAfter: 8 }, 'نقطةٌ أولى — ثلاثُ نقاطٍ بحدٍّ أعلى'),
    ],
  })

  define({
    title: L.STATEMENT,
    background: { color: C.cream },
    objects: [
      marker('mark', null, C.gold, (G.W - 0.42) / 2, 1.5, 0.42),
      ph('statement', 'title', { x: 1.5, y: 2.2, w: G.W - 3, h: 2.55 }, { fontFace: FONT.head, fontSize: TYPE.statement, bold: true, color: C.ink, align: 'center', valign: 'middle', lineSpacingMultiple: 1.0 }, 'الرسالةُ التي يجب أن يخرج بها الحاضرون'),
      ph('lead', 'body', { x: 2.4, y: 4.95, w: G.W - 4.8, h: 0.9 }, { fontSize: TYPE.lead, color: C.ink2, align: 'center', lineSpacingMultiple: 1.15 }, 'سطرٌ داعمٌ واحد'),
    ],
  })

  define({
    title: L.QUOTE,
    background: { color: C.night },
    objects: [
      glowM(G.right - 0.7, 1.25, 2.6, 10),
      // علامةُ الافتتاح كما تُرى في سطرٍ عربيّ: «»» عند الطرف الأيمن متّجهةً إلى الخارج (تُكتب في صندوقٍ
      // من اليسار إلى اليمين فلا تتوقّف هيئتُها على قلب المحرّك للرمز)
      { text: { text: '»', options: { x: G.right - 1.25, y: 0.12, w: 1.25, h: 1.5, fontFace: FONT.head, fontSize: 150, bold: true, color: C.gold, align: 'right', valign: 'top', margin: 0, rtlMode: false } } },
      ph('quote', 'body', { x: 1.45, y: 2.2, w: G.right - 1.45, h: 3.05 }, { fontFace: FONT.head, fontSize: TYPE.quote, color: C.pearl, valign: 'top', lineSpacingMultiple: 1.2 }, 'اقتباسٌ قصيرٌ يحمل الفكرة في جملة'),
      // اسمُ القائل ونقطتُه المعيّنة في خانةٍ واحدة: تجري النقطةُ مع الاسم حيث جرى تحت الاقتباس
      ph('name', 'body', { x: G.mx, y: 5.42, w: G.cw, h: 0.32 }, { fontSize: 15, bold: true, color: C.pearl, valign: 'middle', bullet: { code: '25C6', indent: 16 } }, 'اسمُ القائل'),
      ph('role', 'body', { x: G.mx, y: 5.8, w: G.cw - 0.22, h: 0.32 }, { fontSize: TYPE.small, color: C.pearl2, valign: 'middle' }, 'صفتُه — ولماذا يهمّ قولُه هنا'),
    ],
  })

  const it = GEO.imageText
  define({
    title: L.IMAGE,
    background: { color: C.cream },
    objects: [
      ph('image', 'image', { x: 0, y: 0, w: GEO.imageW, h: G.H }, { color: C.ink2 }, 'أفلِت الصورةَ هنا'),
      ...titleBlock({ x: it.x, w: it.w }).slice(0, 2),
      ph('title', 'title', { x: it.x, y: G.titleY, w: it.w, h: 1.35 }, { fontFace: FONT.head, fontSize: TYPE.title, bold: true, color: C.ink, valign: 'top', lineSpacingMultiple: 0.95 }, 'عنوانُ الشريحة'),
      ph('body', 'body', { x: it.x, y: 2.55, w: it.w, h: 3.2 }, { fontSize: 16, color: C.ink, lineSpacingMultiple: 1.2, paraSpaceAfter: 8 }, 'ما تقوله الصورة — في فقرةٍ قصيرة'),
      ph('caption', 'body', { x: it.x, y: 6.0, w: it.w, h: 0.5 }, { fontSize: TYPE.caption, color: C.ink2, lineSpacingMultiple: 1.1 }, 'تسميةُ الصورة ومصدرُها'),
    ],
  })

  define({
    title: L.CLOSING,
    background: { color: C.night },
    objects: [
      glowM(gc.cx, gc.cy, 3.1, 15),
      marker('emblem', C.night3, C.gold, e.x, e.y, e.w),
      marker('lockup', C.white, C.gold, lk.x, lk.y, lk.w),
      eyebrowMark(G.right, GEO.closing.eyebrowY, 0.15),
      ph('eyebrow', 'body', { x: ct.x, y: GEO.closing.eyebrowY, w: ct.w - 0.27, h: 0.32 }, { fontSize: TYPE.eyebrow, bold: true, color: C.goldNight, valign: 'middle' }, 'الخطوةُ التالية'),
      ph('title', 'title', { x: ct.x, y: GEO.closing.titleY, w: ct.w, h: 1.45 }, { fontFace: FONT.head, fontSize: 40, bold: true, color: C.pearl, lineSpacingMultiple: 0.95 }, 'القرارُ المطلوب في جملة'),
      ph('contacts', 'body', { x: ct.x, y: 6.42, w: ct.w, h: 0.36 }, { fontSize: 12.5, color: C.pearl2, valign: 'middle' }, 'البريد  ·  الموقع  ·  الهاتف'),
    ],
  })

  define({ title: L.BLANK, background: { color: C.cream }, objects: [] })
  define({ title: L.BLANK_DARK, background: { color: C.night }, objects: [] })
}
