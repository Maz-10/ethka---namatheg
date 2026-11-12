// ═══ أنواعُ الشرائح — كلُّ نوعٍ دالّةٌ تأخذ المحتوى وتركّبه على تخطيطه ═══
// المحتوى وحده يتغيّر بين عرضٍ وآخر؛ الهندسةُ هنا ثابتة. فإن احتاج عرضٌ شكلًا جديدًا أُضيف نوعٌ
// جديد بالقواعد نفسِها (الرموزُ من `brand.mjs` والمكوّناتُ من `kit.mjs`) ولا يُعدَّل نوعٌ قائم لأجله.

import { C, FONT, TYPE, G, SERIES, MUTED_BAR, mix } from './brand.mjs'
import { L, GEO } from './layouts.mjs'
import { T, digits, ordinal, diamond, card, hair, footer, lines, lineH, numFmt } from './kit.mjs'

// ── ملءُ خانةٍ في التخطيط باسمها (النمطُ من التخطيط؛ نُثبت الاتجاه واللغة فقط)
/** الخاناتُ المُجراة: `at: {y, h}` يُجري خانةً إلى موضعٍ آخر في شريحتها وحدها — لإجراء ما تحت العنوان بقدر
 *  أسطره. pptxgenjs يأخذ موضعَ الخانة من تخطيطها دائمًا، فيُسجَّل هنا (رقمُ الشريحة · رقمُ الخانة) ويكتبه التشطيب. */
export const MOVES = []
function P(slide, name, text, { at, ...o } = {}) {
  if (text == null || text === '') return
  const runs = Array.isArray(text) ? text.map((r) => (typeof r === 'string' ? { text: digits(r) } : { ...r, text: digits(r.text) })) : digits(text)
  slide.addText(runs, { placeholder: name, rtlMode: true, lang: 'ar-SA', ...o })
  if (at) {
    const ph = slide._slideLayout._slideObjects.find((x) => x.options.placeholder === name)
    if (!ph) throw new Error(`لا خانةَ باسم «${name}» في تخطيط الشريحة ${slide._slideNum}`)
    MOVES.push({ slide: slide._slideNum, idx: ph.options._placeholderIdx, y: at.y, h: at.h })
  }
}
const head = (slide, s, ctx) => {
  P(slide, 'eyebrow', s.eyebrow ?? ctx.sectionTitle)
  P(slide, 'title', s.title)
  P(slide, 'lead', s.lead)
}
const notes = (slide, s) => { if (s.notes) slide.addNotes(s.notes) }
const top = G.bodyY
const bottom = G.bodyBottom

// ── صفٌّ من خاناتٍ معنونة (المقدِّم · الجهة · التاريخ — أو قنوات التواصل) على الليل
function labelled(slide, pres, items, { x, w, y }) {
  const n = items.length
  const cw = w / n
  items.forEach((it, i) => {
    const r = x + w - i * cw // الحدُّ الأيمن للخانة (من اليمين)
    const label = typeof it === 'string' ? null : it.label
    const value = typeof it === 'string' ? it : it.value
    diamond(slide, pres, r - 0.06, y + 0.12, 0.11, { fill: C.gold })
    if (label) T(slide, label, { x: r - cw + 0.15, y, w: cw - 0.35, h: 0.24, fontSize: 11, bold: true, color: C.goldNight, valign: 'middle' })
    T(slide, value, { x: r - cw + 0.15, y: label ? y + 0.28 : y, w: cw - 0.35, h: 0.3, fontSize: 13.5, color: C.pearl, valign: 'middle', latin: it.latin })
  })
}

export const RENDER = {
  // ◆ الغلاف — العنوانُ يمينًا والرمزُ الكبير يسارًا، والشعارُ مرّةً واحدة بحضوره الكامل
  cover(ctx, s) {
    const slide = ctx.slide(L.COVER)
    const ct = GEO.coverText, ty = GEO.cover.titleY
    const th = lines(s.title, TYPE.display, ct.w, { head: true }) * lineH(TYPE.display, 0.95) + 0.08
    P(slide, 'eyebrow', s.eyebrow)
    P(slide, 'title', s.title, { at: { y: ty, h: th } })
    P(slide, 'lead', s.lead, { at: { y: ty + th + 0.24, h: lines(s.lead, TYPE.lead, ct.w) * lineH(TYPE.lead, 1.15) + 0.1 } })
    if (s.meta?.length) labelled(slide, ctx.pres, s.meta, { x: GEO.coverText.x, w: GEO.coverText.w, y: 6.18 })
    notes(slide, s)
    return slide
  },

  // ◆ الفهرس — يُشتقّ من فواصل الأقسام إن لم تُكتب بنودُه (مصدرٌ واحد: عنوانُ القسم يُكتب مرّة)
  agenda(ctx, s) {
    const { pres, deck } = ctx
    const slide = ctx.slide(L.TITLE)
    head(slide, { eyebrow: s.eyebrow ?? 'المحتوى', title: s.title ?? 'محاورُ العرض', lead: s.lead }, ctx)
    const items = s.items ?? deck.slides.filter((x) => x.type === 'section').map((x) => ({ title: x.title, text: x.lead }))
    const cols = items.length > 3 ? 2 : 1
    const rows = Math.ceil(items.length / cols)
    const colW = cols === 2 ? (G.cw - 0.6) / 2 : G.cw * 0.62
    const rowH = (bottom - top) / Math.max(rows, 2) // صفّان على الأقلّ: البندُ لا يتمدّد بلا حدّ
    const big = rows <= 2 // قلّت البنود فكبُرت: الفهرسُ يملأ لوحَه
    items.forEach((it, i) => {
      const c = Math.floor(i / rows), r = i % rows // ترتيبٌ عموديّ: العمودُ الأيمن أوّلًا
      const right = G.right - c * (colW + 0.6)
      const x = right - colW, y = top + r * rowH
      hair(slide, pres, x, y, colW)
      T(slide, ordinal(i + 1), { x: right - 1.15, y: y + 0.22, w: 1.15, h: big ? 0.8 : 0.55, fontFace: FONT.head, fontSize: big ? 44 : 30, bold: true, color: C.goldInk, valign: 'top' })
      T(slide, it.title, { x, y: y + 0.3, w: colW - 1.35, h: 0.5, fontFace: FONT.head, fontSize: big ? 26 : 20, bold: true, valign: 'middle' })
      if (it.text) T(slide, it.text, { x, y: y + 0.9, w: colW - 1.35, h: rowH - 1.0, fontSize: big ? 15 : TYPE.small, color: C.ink2, lineSpacingMultiple: 1.2 })
    })
    footer(slide, pres, deck, ctx.n)
    notes(slide, s)
    return slide
  },

  // ◆ فاصلُ القسم — رقمٌ كبير وعنوانٌ وجملةٌ تقريريّة، ومسارُ الأقسام معيّناتٍ تقول: أين نحن
  section(ctx, s) {
    const { pres } = ctx
    const slide = ctx.slide(L.SECTION)
    P(slide, 'number', ordinal(ctx.sectionNo))
    const tw = G.right - 4.4, ty = GEO.section.titleY
    const th = lines(s.title, TYPE.section, tw, { head: true }) * lineH(TYPE.section, 0.95) + 0.08
    P(slide, 'title', s.title, { at: { y: ty, h: th } })
    P(slide, 'lead', s.lead, { at: { y: ty + th + 0.26, h: lines(s.lead, TYPE.lead, G.right - 5.6) * lineH(TYPE.lead, 1.15) + 0.1 } })
    const N = ctx.sectionCount, d = 0.17, step = 0.36, y = 6.62
    for (let i = 1; i <= N; i++) {
      const cx = G.right - d / 2 - (i - 1) * step
      const cur = i === ctx.sectionNo
      diamond(slide, pres, cx, y, cur ? d + 0.04 : d, i <= ctx.sectionNo ? { fill: C.gold } : { fill: null, line: C.pearl2, lineW: 0.9 })
    }
    T(slide, `القسم ${ctx.sectionNo} من ${N}`, { x: G.mx, y: y - 0.16, w: G.cw - N * step - 0.2, h: 0.32, fontSize: 12, color: C.pearl2, valign: 'middle' })
    notes(slide, s)
    return slide
  },

  // ◆ نقاط + دليل — ثلاثُ نقاطٍ أو أربع، وبطاقةُ دليلٍ واحدة تسند الاستنتاج
  points(ctx, s) {
    const { pres, deck } = ctx
    const slide = ctx.slide(L.TITLE)
    head(slide, s, ctx)
    const pts = s.points ?? []
    const mainW = s.aside ? 6.95 : G.cw * 0.72
    const slot = Math.min(1.3, (bottom - top) / Math.max(pts.length, 1))
    pts.forEach((p, i) => {
      const y = top + i * slot
      diamond(slide, pres, G.right - 0.08, y + 0.19, 0.16, { fill: C.gold })
      T(slide, p.title, { x: G.right - mainW, y, w: mainW - 0.36, h: 0.38, fontSize: TYPE.h3, bold: true, valign: 'middle' })
      if (p.text) T(slide, p.text, { x: G.right - mainW, y: y + 0.42, w: mainW - 0.36, h: slot - 0.5, fontSize: TYPE.body, color: C.ink2, lineSpacingMultiple: 1.18 })
    })
    if (s.aside) {
      const a = s.aside, w = G.cw - 6.95 - 0.45, x = G.mx, pad = 0.38
      const textH = a.text ? lines(a.text, TYPE.small, w - 2 * pad) * lineH(TYPE.small, 1.2) + 0.1 : 0
      const ch = pad + 0.5 + (a.value != null ? 1.15 : 0) + (a.title ? 1.0 : 0) + (a.label ? 0.42 : 0) + textH + pad
      card(slide, pres, x, top, w, Math.min(ch, bottom - top))
      T(slide, a.kicker, { x: x + pad, y: top + pad, w: w - 2 * pad, h: 0.3, fontSize: TYPE.eyebrow, bold: true, color: C.goldInk, valign: 'middle' })
      let y = top + pad + 0.5
      if (a.value != null) {
        T(slide, [{ text: a.value }, ...(a.unit ? [{ text: ' ' + a.unit, options: { fontSize: 24 } }] : [])],
          { x: x + pad, y, w: w - 2 * pad, h: 1.05, fontFace: FONT.head, fontSize: 60, bold: true, valign: 'middle' })
        y += 1.15
      }
      if (a.title) { T(slide, a.title, { x: x + pad, y, w: w - 2 * pad, h: 0.9, fontFace: FONT.head, fontSize: 22, bold: true, lineSpacingMultiple: 1.05 }); y += 1.0 }
      if (a.label) { T(slide, a.label, { x: x + pad, y, w: w - 2 * pad, h: 0.36, fontSize: 15, bold: true }); y += 0.42 }
      if (a.text) T(slide, a.text, { x: x + pad, y, w: w - 2 * pad, h: textH, fontSize: TYPE.small, color: C.ink2, lineSpacingMultiple: 1.2 })
    }
    footer(slide, pres, deck, ctx.n)
    notes(slide, s)
    return slide
  },

  // ◆ متن حرّ — العنوانُ والمتنُ في خاناتهما (نقاطٌ بمعيّنٍ ذهبيّ من نمط التخطيط)
  text(ctx, s) {
    const { pres, deck } = ctx
    const slide = ctx.slide(L.CONTENT)
    head(slide, s, ctx)
    const items = (s.body ?? []).map((t, i, a) => ({ text: digits(t), options: { bullet: { code: '25C6' }, breakLine: i < a.length - 1 } }))
    if (items.length) slide.addText(items, { placeholder: 'body', rtlMode: true, lang: 'ar-SA' })
    footer(slide, pres, deck, ctx.n)
    notes(slide, s)
    return slide
  },

  // ◆ أرقام — رقمان إلى أربعة، وواحدٌ مُبرَز يحمل المعيّن الذهبيّ
  stats(ctx, s) {
    const { pres, deck } = ctx
    const slide = ctx.slide(L.TITLE)
    head(slide, s, ctx)
    const st = s.stats ?? [], n = st.length, gap = G.gap
    const w = (G.cw - (n - 1) * gap) / n, pad = 0.36
    const lab = (it) => lines(it.label, 16, w - 2 * pad) * lineH(16, 1.05)
    const txt = (it) => (it.text ? lines(it.text, TYPE.small, w - 2 * pad) * lineH(TYPE.small, 1.18) : 0)
    const h = Math.max(s.note ? 3.1 : 3.5, ...st.map((it) => 1.82 + lab(it) + 0.14 + txt(it) + pad))
    st.forEach((it, i) => {
      const x = G.right - (i + 1) * w - i * gap
      card(slide, pres, x, top, w, h, it.highlight ? {} : { shadow: false, fill: C.paper })
      diamond(slide, pres, x + w - pad - 0.08, top + pad + 0.08, 0.16, it.highlight ? { fill: C.gold } : { fill: null, line: mix(C.ink2, C.cream, 0.35), lineW: 0.9 })
      T(slide, [{ text: it.value }, ...(it.unit ? [{ text: ' ' + it.unit, options: { fontSize: 22 } }] : [])],
        { x: x + pad, y: top + 0.62, w: w - 2 * pad, h: 1.05, fontFace: FONT.head, fontSize: n > 3 ? 46 : TYPE.stat, bold: true, color: it.highlight ? C.goldInk : C.ink, valign: 'bottom' })
      const lh = lab(it)
      T(slide, it.label, { x: x + pad, y: top + 1.82, w: w - 2 * pad, h: lh + 0.05, fontSize: 16, bold: true, lineSpacingMultiple: 1.05 })
      if (it.text) T(slide, it.text, { x: x + pad, y: top + 1.82 + lh + 0.14, w: w - 2 * pad, h: h - (1.82 + lh + 0.14) - pad + 0.12, fontSize: TYPE.small, color: C.ink2, lineSpacingMultiple: 1.18 })
    })
    if (s.note) {
      diamond(slide, pres, G.right - 0.07, top + h + 0.46, 0.13, { fill: C.gold })
      T(slide, s.note, { x: G.mx, y: top + h + 0.28, w: G.cw - 0.3, h: 0.38, fontSize: 15, bold: true, valign: 'middle' })
    }
    if (s.source) T(slide, s.source, { x: G.mx, y: bottom - 0.05, w: G.cw, h: 0.28, fontSize: TYPE.caption, color: C.ink2 })
    footer(slide, pres, deck, ctx.n)
    notes(slide, s)
    return slide
  },

  // ◆ رسمٌ بيانيّ أصيل (قابلٌ لتحرير بياناته في باوربوينت) + ما يعنيه
  //   الذهبُ للمُبرَز وحده: عمودٌ في سلسلةٍ واحدة (`highlight` رقمُ الفئة)، أو سلسلةٌ بين سلاسل (`highlight`
  //   رقمُ السلسلة، وافتراضُه الأخيرة — الأحدث)، أو شريحةٌ في الحلقة (رقمُ الفئة، وافتراضُه الأولى).
  chart(ctx, s) {
    const { pres, deck } = ctx
    const slide = ctx.slide(L.TITLE)
    head(slide, s, ctx)
    const ch = s.chart, panelW = 3.95, gap = 0.4
    const cw = G.cw - panelW - gap
    const cx = G.mx, cy = top, chH = bottom - top - 0.35
    const kind = ch.kind ?? 'column'
    const one = ch.series.length === 1
    const data = ch.series.map((se) => ({ name: digits(se.name), labels: ch.categories.map(digits), values: se.values }))
    const neutral = [C.ink, mix(C.ink, C.cream, 0.45), mix(C.ink, C.cream, 0.7), C.ink2]
    const base = {
      catAxisLabelFontFace: FONT.body, catAxisLabelFontSize: 12, catAxisLabelColor: C.ink,
      valAxisLabelFontFace: FONT.body, valAxisLabelFontSize: 11, valAxisLabelColor: C.ink2,
      dataLabelFontFace: FONT.body, dataLabelFontSize: 12, dataLabelColor: C.ink, dataLabelFontBold: true,
      dataLabelFormatCode: numFmt(ch.format), valAxisLabelFormatCode: numFmt(ch.axisFormat ?? ch.format),
      legendFontFace: FONT.body, legendFontSize: 11, legendColor: C.ink2, legendPos: 'b',
      catGridLine: { style: 'none' }, showTitle: false,
    }
    if (kind === 'doughnut') {
      // الحلقة: بلا تسمياتٍ على الشرائح (تضيع على الداكن منها)، والمُبرَزُ رقمٌ كبيرٌ في قلبها،
      // ومفتاحُها صفوفٌ بمعيّناتٍ ملوّنة بجوارها — بخطّ الهيئة لا بمفتاح الرسم
      const hi = ch.highlight ?? 0
      const colors = ch.categories.map((_, i) => (i === hi ? C.gold : neutral[(i - (i > hi ? 1 : 0)) % neutral.length]))
      const side = Math.min(chH, cw * 0.55), dx = cx, dy = cy + (chH - side) / 2
      slide.addChart(pres.charts.DOUGHNUT, data, { ...base, x: dx, y: dy, w: side, h: side, chartColors: colors, holeSize: 64, showValue: false, showPercent: false, showLabel: false, showLegend: false, dataBorder: { pt: 1.5, color: C.cream } })
      const vals = ch.series[0].values, total = vals.reduce((a, b) => a + b, 0)
      const pct = (v) => digits(Math.round((v / total) * 100) + '%')
      T(slide, pct(vals[hi]), { x: dx, y: dy + side / 2 - 0.42, w: side, h: 0.6, fontFace: FONT.head, fontSize: 30, bold: true, align: 'center', valign: 'middle' })
      T(slide, ch.categories[hi], { x: dx + 0.3, y: dy + side / 2 + 0.16, w: side - 0.6, h: 0.32, fontSize: 12, color: C.ink2, align: 'center', valign: 'middle' })
      const lx = dx + side + 0.5, lw = cx + cw - lx, rowH = 0.5
      const ly = cy + (chH - ch.categories.length * rowH) / 2
      ch.categories.forEach((c, i) => {
        const y = ly + i * rowH
        diamond(slide, pres, cx + cw - 0.08, y + 0.2, 0.16, { fill: colors[i] })
        T(slide, c, { x: lx + 0.8, y, w: lw - 1.15, h: 0.4, fontSize: 14, bold: i === hi, valign: 'middle' })
        T(slide, pct(vals[i]), { x: lx, y, w: 0.8, h: 0.4, fontSize: 14, bold: true, color: i === hi ? C.goldInk : C.ink2, align: 'left', valign: 'middle' })
        if (i < ch.categories.length - 1) hair(slide, pres, lx, y + rowH - 0.05, lw)
      })
    } else {
      const hi = ch.highlight ?? (one ? (kind === 'line' ? 0 : null) : ch.series.length - 1)
      const colors = one && kind !== 'line'
        ? ch.categories.map((_, i) => (hi == null || hi === i ? C.gold : MUTED_BAR))
        : ch.series.map((_, i) => (i === hi ? C.gold : neutral[(i - (i > hi ? 1 : 0)) % neutral.length]))
      slide.addChart(kind === 'line' ? pres.charts.LINE : pres.charts.BAR, data, {
        ...base, x: cx, y: cy, w: cw, h: chH,
        barDir: kind === 'bar' ? 'bar' : 'col',
        chartColors: colors,
        // اتجاهُ القراءة: الفئةُ الأولى من اليمين (أو في الأعلى)، والأعمدةُ الأفقيّة تنمو من اليمين
        catAxisOrientation: 'maxMin',
        valAxisOrientation: kind === 'bar' ? 'maxMin' : 'minMax',
        valAxisHidden: kind !== 'line', valAxisLineShow: false,
        catAxisLineShow: kind !== 'bar', catAxisLineColor: C.line,
        valGridLine: kind === 'line' ? { color: C.line, size: 0.75 } : { style: 'none' },
        showValue: kind !== 'line', dataLabelPosition: 'outEnd',
        barGapWidthPct: one ? 55 : 80, barOverlapPct: one ? 0 : -8,
        showLegend: !one,
        lineSize: 2.25, lineDataSymbol: 'diamond', lineDataSymbolSize: 9,
      })
    }
    if (s.source) T(slide, s.source, { x: cx, y: bottom - 0.25, w: cw, h: 0.28, fontSize: TYPE.caption, color: C.ink2 })
    // لوحةُ «ما يعنيه» — رملٌ بلا ظلّ: تفسيرٌ لا بطاقةٌ تنافس الرسم
    const t = s.takeaway ?? {}, px = G.right - panelW, pad = 0.36
    card(slide, pres, px, top, panelW, bottom - top, { fill: C.sand, line: null, shadow: false })
    T(slide, t.kicker ?? 'ما يعنيه', { x: px + pad, y: top + pad, w: panelW - 2 * pad - 0.25, h: 0.3, fontSize: TYPE.eyebrow, bold: true, color: C.goldInk, valign: 'middle' })
    diamond(slide, pres, G.right - pad - 0.07, top + pad + 0.15, 0.14, { fill: C.gold })
    const tth = lines(t.title, 21, panelW - 2 * pad, { head: true }) * lineH(21, 1.05) + 0.08
    T(slide, t.title, { x: px + pad, y: top + pad + 0.48, w: panelW - 2 * pad, h: tth, fontFace: FONT.head, fontSize: 21, bold: true, lineSpacingMultiple: 1.05 })
    let y = top + pad + 0.48 + tth + 0.38
    for (const p of t.points ?? []) {
      const ph = lines(p, 13.5, panelW - 2 * pad) * lineH(13.5, 1.15) + 0.06
      hair(slide, pres, px + pad, y - 0.16, panelW - 2 * pad, mix(C.line, C.ink2, 0.15))
      T(slide, p, { x: px + pad, y, w: panelW - 2 * pad, h: ph, fontSize: 13.5, color: C.ink2, lineSpacingMultiple: 1.15 })
      y += ph + 0.32
    }
    footer(slide, pres, deck, ctx.n)
    notes(slide, s)
    return slide
  },

  // ◆ جدول — رأسٌ رمليّ وخيوطٌ شعريّة وصفٌّ مُبرَزٌ بظلّ الذهب
  table(ctx, s) {
    const { pres, deck } = ctx
    const slide = ctx.slide(L.TITLE)
    head(slide, s, ctx)
    const cols = s.columns, n = cols.length
    const widths = (s.widths ?? cols.map(() => 1))
    const sum = widths.reduce((a, b) => a + b, 0)
    const colW = widths.map((w) => (w / sum) * G.cw)
    const align = s.align ?? cols.map((_, i) => (i === 0 ? 'right' : 'center'))
    const rule = { type: 'solid', pt: 0.75, color: C.line }
    const none = { type: 'none' }
    const cell = (text, o) => ({ text: digits(text), options: { rtlMode: true, lang: 'ar-SA', fontFace: FONT.body, valign: 'middle', margin: [0, 0.14, 0, 0.14], ...o } })
    const header = cols.map((c, i) => cell(c, { bold: true, fontSize: 13, color: C.ink, fill: { color: C.sand }, align: align[i], border: [none, none, { type: 'solid', pt: 1, color: mix(C.line, C.ink2, 0.3) }, none] }))
    const body = s.rows.map((row, r) => row.map((v, i) => cell(v, {
      fontSize: 13.5, color: i === 0 ? C.ink : C.ink2, bold: i === 0 || r === s.highlightRow,
      fill: { color: r === s.highlightRow ? mix(C.gold, C.paper, 0.86) : C.paper }, align: align[i],
      border: [none, none, rule, none],
    })))
    const rowH = Math.min(0.52, (bottom - top - 0.55) / (s.rows.length + 1))
    // الأعمدةُ تُرصف من اليمين صراحةً: يُعكس ترتيبُها هنا بدل علامة «جدولٌ من اليمين» التي يحترمها باوربوينت
    // ويتجاهلها غيرُه — فيتطابق الجدولُ في كل محرّك (ولو اجتمع العكسان لانقلب الجدولُ مرّتين)
    const rtl = (row) => [...row].reverse()
    slide.addTable([header, ...body].map(rtl), { x: G.mx, y: top, w: G.cw, colW: rtl(colW), rowH, objectName: 'جدول' })
    if (s.note) T(slide, s.note, { x: G.mx, y: bottom - 0.25, w: G.cw, h: 0.28, fontSize: TYPE.caption, color: C.ink2 })
    footer(slide, pres, deck, ctx.n)
    notes(slide, s)
    return slide
  },

  // ◆ مراحل — مسارٌ يجري من اليمين، ومعيّنٌ لكل محطّة: مُنجَزٌ ذهبيّ · حاليٌّ بهالة · قادمٌ مفرَّغ
  timeline(ctx, s) {
    const { pres, deck } = ctx
    const slide = ctx.slide(L.TITLE)
    head(slide, s, ctx)
    const st = s.steps, n = st.length, span = G.cw / n, ly = 3.72
    const cxOf = (i) => G.right - span * (i + 0.5)
    const nowIdx = st.findIndex((x) => x.state === 'now')
    slide.addShape(pres.shapes.LINE, { x: cxOf(n - 1), y: ly, w: cxOf(0) - cxOf(n - 1), h: 0, line: { color: mix(C.line, C.ink2, 0.25), width: 1.25 }, objectName: 'مسار' })
    if (nowIdx > 0) slide.addShape(pres.shapes.LINE, { x: cxOf(nowIdx), y: ly, w: cxOf(0) - cxOf(nowIdx), h: 0, line: { color: C.gold, width: 2 }, objectName: 'مسار مُنجَز' })
    st.forEach((p, i) => {
      const cx = cxOf(i)
      const state = p.state ?? (nowIdx < 0 ? 'done' : i < nowIdx ? 'done' : i === nowIdx ? 'now' : 'next')
      if (state === 'now') diamond(slide, pres, cx, ly, 0.6, { fill: C.cream, line: C.gold, lineW: 1 })
      diamond(slide, pres, cx, ly, 0.3, state === 'next' ? { fill: C.cream, line: C.ink2, lineW: 1.25 } : { fill: C.gold })
      T(slide, p.label ?? `المرحلة ${i + 1}`, { x: cx - span / 2 + 0.1, y: ly - 0.82, w: span - 0.2, h: 0.32, fontSize: 12.5, bold: true, color: state === 'next' ? C.ink2 : C.goldInk, align: 'center', valign: 'middle' })
      T(slide, p.title, { x: cx - span / 2 + 0.12, y: ly + 0.52, w: span - 0.24, h: 0.42, fontSize: 17, bold: true, align: 'center', valign: 'middle' })
      if (p.text) T(slide, p.text, { x: cx - span / 2 + 0.18, y: ly + 0.98, w: span - 0.36, h: 1.6, fontSize: TYPE.small, color: C.ink2, align: 'center', lineSpacingMultiple: 1.18 })
    })
    footer(slide, pres, deck, ctx.n)
    notes(slide, s)
    return slide
  },

  // ◆ بطاقات — ثلاثٌ في صفّ، أو أربعٌ في شبكة، أو ستٌّ في شبكتين
  cards(ctx, s) {
    const { pres, deck } = ctx
    const slide = ctx.slide(L.TITLE)
    head(slide, s, ctx)
    const cs = s.cards, n = cs.length, gap = G.gap
    const cols = n <= 3 ? n : n === 4 ? 2 : 3
    const rows = Math.ceil(n / cols)
    const w = (G.cw - (cols - 1) * gap) / cols, h = (bottom - top - (rows - 1) * gap) / rows, pad = 0.34
    cs.forEach((c, i) => {
      const col = i % cols, row = Math.floor(i / cols)
      const x = G.right - (col + 1) * w - col * gap, y = top + row * (h + gap)
      card(slide, pres, x, y, w, h)
      // «عيّنة»: معيّنٌ بلون البطاقة مكانَ رقمها (لبطاقات الألوان) — بخيطٍ إن كان اللونُ فاتحًا
      const tag = (tx, ty, d) => c.swatch
        ? diamond(slide, pres, tx, ty, d, { fill: c.swatch.replace('#', ''), line: mix(C.line, C.ink2, 0.3), lineW: 0.5 })
        : null
      if (rows === 1) {
        if (c.swatch) tag(x + w - pad - 0.25, y + pad + 0.25, 0.5)
        else T(slide, ordinal(i + 1), { x: x + pad, y: y + pad, w: w - 2 * pad, h: 0.5, fontFace: FONT.head, fontSize: 26, bold: true, color: C.goldInk, valign: 'middle' })
        T(slide, c.title, { x: x + pad, y: y + pad + 0.72, w: w - 2 * pad, h: 0.75, fontSize: TYPE.h3, bold: true, lineSpacingMultiple: 1.1 })
        T(slide, c.text, { x: x + pad, y: y + pad + 1.55, w: w - 2 * pad, h: h - 2 * pad - 1.55, fontSize: 14, color: C.ink2, lineSpacingMultiple: 1.2 })
      } else {
        if (c.swatch) tag(x + w - pad - 0.21, y + pad + 0.17, 0.42)
        else T(slide, ordinal(i + 1), { x: x + w - pad - 0.62, y: y + pad - 0.04, w: 0.62, h: 0.42, fontFace: FONT.head, fontSize: 22, bold: true, color: C.goldInk, valign: 'middle' })
        T(slide, c.title, { x: x + pad, y: y + pad, w: w - 2 * pad - 0.72, h: 0.38, fontSize: 17, bold: true, valign: 'middle' })
        T(slide, c.text, { x: x + pad, y: y + pad + 0.55, w: w - 2 * pad, h: h - 2 * pad - 0.55, fontSize: 14.5, color: C.ink2, lineSpacingMultiple: 1.2 })
      }
    })
    footer(slide, pres, deck, ctx.n)
    notes(slide, s)
    return slide
  },

  // ◆ مقارنة — عمودان غيرُ متساويين لأن الأولويّة غيرُ متساوية: الموصى به ورقٌ بظلّ، والبديلُ رملٌ هادئ
  compare(ctx, s) {
    const { pres, deck } = ctx
    const slide = ctx.slide(L.TITLE)
    head(slide, s, ctx)
    const pw = 6.75, sw = G.cw - pw - G.gap, pad = 0.4
    const panel = (side, x, w, primary) => {
      card(slide, pres, x, top, w, bottom - top, primary ? {} : { fill: C.sand, line: null, shadow: false })
      diamond(slide, pres, x + w - pad - 0.075, top + pad + 0.15, 0.15, primary ? { fill: C.gold } : { fill: null, line: C.ink2, lineW: 1 })
      T(slide, side.kicker, { x: x + pad, y: top + pad, w: w - 2 * pad - 0.3, h: 0.3, fontSize: TYPE.eyebrow, bold: true, color: primary ? C.goldInk : C.ink2, valign: 'middle' })
      T(slide, side.title, { x: x + pad, y: top + pad + 0.45, w: w - 2 * pad, h: 0.95, fontFace: FONT.head, fontSize: primary ? 24 : 21, bold: true, lineSpacingMultiple: 1.05 })
      const items = side.items ?? []
      const slot = Math.min(0.62, (bottom - top - pad * 2 - 1.55) / Math.max(items.length, 1))
      items.forEach((it, i) => {
        const y = top + pad + 1.55 + i * slot
        diamond(slide, pres, x + w - pad - 0.06, y + 0.17, 0.11, primary ? { fill: C.gold } : { fill: mix(C.ink2, C.sand, 0.4) })
        T(slide, it, { x: x + pad, y, w: w - 2 * pad - 0.28, h: slot, fontSize: primary ? 15.5 : 14.5, color: primary ? C.ink : C.ink2, lineSpacingMultiple: 1.12 })
      })
    }
    panel(s.primary, G.right - pw, pw, true)
    panel(s.secondary, G.mx, sw, false)
    footer(slide, pres, deck, ctx.n)
    notes(slide, s)
    return slide
  },

  // ◆ اقتباس — على الليل، بعلامة تنصيصٍ ذهبيّة واسمٍ وصفة
  quote(ctx, s) {
    const slide = ctx.slide(L.QUOTE)
    const qw = G.right - 1.45, qy = 2.2
    const qh = lines(s.text, TYPE.quote, qw, { head: true }) * lineH(TYPE.quote, 1.2) + 0.1
    P(slide, 'quote', s.text, { at: { y: qy, h: qh } })
    P(slide, 'name', s.name, { at: { y: qy + qh + 0.5, h: 0.32 } })
    P(slide, 'role', s.role, { at: { y: qy + qh + 0.86, h: 0.32 } })
    notes(slide, s)
    return slide
  },

  // ◆ رسالةٌ محوريّة — جملةٌ واحدة تستحقّ شريحةً كاملة
  statement(ctx, s) {
    const slide = ctx.slide(L.STATEMENT)
    P(slide, 'statement', s.text)
    P(slide, 'lead', s.lead)
    footer(slide, ctx.pres, ctx.deck, ctx.n)
    notes(slide, s)
    return slide
  },

  // ◆ صورة ونصّ — الصورةُ تنزف من الحافّة اليسرى، والنصُّ في عمود البداية
  image(ctx, s) {
    const { pres, deck } = ctx
    const slide = ctx.slide(L.IMAGE)
    if (s.image) slide.addImage({ path: s.image, placeholder: 'image', x: 0, y: 0, w: GEO.imageW, h: G.H, sizing: { type: 'cover', w: GEO.imageW, h: G.H }, altText: s.alt ?? s.caption ?? s.title })
    const it = GEO.imageText
    const th = lines(s.title, TYPE.title, it.w, { head: true }) * lineH(TYPE.title, 0.95) + 0.1
    P(slide, 'eyebrow', s.eyebrow ?? ctx.sectionTitle)
    P(slide, 'title', s.title, { at: { y: G.titleY, h: th } })
    if (s.text) P(slide, 'body', s.text, { at: { y: G.titleY + th + 0.3, h: 5.75 - (G.titleY + th + 0.3) } })
    P(slide, 'caption', s.caption)
    // التذييلُ في عمود النصّ (الصورةُ تشغل يسارَ اللوح)
    const fx = GEO.imageText.x
    T(slide, deck.meta.short || deck.meta.title, { x: fx + 1, y: G.footY, w: G.right - fx - 1, h: 0.26, fontSize: TYPE.caption, color: C.ink2, valign: 'middle' })
    diamond(slide, pres, fx + 0.06, G.footY + 0.13, 0.11, { fill: C.gold })
    T(slide, ordinal(ctx.n), { x: fx + 0.2, y: G.footY, w: 0.8, h: 0.26, fontSize: TYPE.caption, bold: true, align: 'left', valign: 'middle', rtlMode: false })
    notes(slide, s)
    return slide
  },

  // ◆ الختام — القرارُ المطلوب والخطواتُ التالية وقنواتُ التواصل، والرمزُ يغلق ما فتحه الغلاف
  closing(ctx, s) {
    const { pres } = ctx
    const slide = ctx.slide(L.CLOSING)
    const ct = GEO.coverText, ty = GEO.closing.titleY
    const th = lines(s.title, 40, ct.w, { head: true }) * lineH(40, 0.95) + 0.08
    P(slide, 'eyebrow', s.eyebrow ?? 'الخطوة التالية')
    P(slide, 'title', s.title, { at: { y: ty, h: th } })
    ;(s.steps ?? []).slice(0, 4).forEach((st, i) => {
      const y = ty + th + 0.42 + i * 0.56
      diamond(slide, pres, G.right - 0.07, y + 0.21, 0.13, { fill: C.gold })
      T(slide, st, { x: ct.x, y, w: ct.w - 0.34, h: 0.42, fontSize: 16, color: C.pearl, valign: 'middle' })
    })
    if (s.contacts?.length) labelled(slide, pres, s.contacts, { x: ct.x, w: ct.w, y: 6.18 })
    notes(slide, s)
    return slide
  },
}
