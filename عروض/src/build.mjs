#!/usr/bin/env node
// ═══ المولِّد — محتوى ← عرض ═══
// الاستعمال:  node src/build.mjs <ملف-المحتوى.json> [--out <مجلد>] [--template]
// المحتوى وحده يُكتب لكل عرضٍ جديد (انظر `content/specimen.json` و README)؛ التخطيطاتُ والأنواعُ ثابتة.

import pptxgen from 'pptxgenjs'
import { readFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname, basename, isAbsolute, join } from 'node:path'
import { C, FONT, TYPE, BRAND } from './brand.mjs'
import { defineLayouts, LAYOUT_COUNT } from './layouts.mjs'
import { RENDER, MOVES } from './slides.mjs'
import { setNumerals } from './kit.mjs'
import { finalize } from './finalize.mjs'

const args = process.argv.slice(2)
const src = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--out')
if (!src) {
  console.error('الاستعمال: node src/build.mjs <ملف-المحتوى.json> [--out <مجلد>] [--template]')
  process.exit(1)
}
const outDir = resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : 'out')
const asTemplate = args.includes('--template')

const deck = JSON.parse(readFileSync(src, 'utf8'))
const base = dirname(resolve(src))
const fileBase = deck.meta.file ?? basename(src, '.json')

// متغيّراتُ المحتوى: «{{layouts}}» و«{{types}}» و«{{type.title}}» و«{{color.night}}» تُقرأ من الرموز نفسِها،
// فلا يذكر نصٌّ رقمًا يفترق عن حقيقته (عددُ التخطيطات أو مقاسُ الخطّ أو رمزُ اللون).
const VARS = {
  layouts: LAYOUT_COUNT,
  types: Object.keys(RENDER).length,
  ...Object.fromEntries(Object.entries(TYPE).map(([k, v]) => [`type.${k}`, v])),
  ...Object.fromEntries(Object.entries(C).map(([k, v]) => [`color.${k}`, `\`#${v}\``])),
}
const fill = (v) => typeof v === 'string'
  ? v.replace(/\{\{([\w.]+)\}\}/g, (m, k) => { if (!(k in VARS)) throw new Error(`متغيّرٌ غيرُ معروف ${m}`); return VARS[k] })
  : Array.isArray(v) ? v.map(fill) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v
deck.slides = fill(deck.slides)
deck.meta = fill(deck.meta)

// تحقّقٌ قبل البناء: نوعٌ غيرُ معروف يُرفض باسمه لا يُتجاوز صامتًا
for (const [i, s] of deck.slides.entries()) {
  if (!RENDER[s.type]) throw new Error(`الشريحة ${i + 1}: نوعٌ غيرُ معروف «${s.type}» — الأنواع: ${Object.keys(RENDER).join('، ')}`)
  if (s.image && !isAbsolute(s.image)) s.image = resolve(base, s.image)
}

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE'
pres.rtlMode = true
pres.title = deck.meta.title
pres.subject = deck.meta.subject ?? deck.meta.title
pres.author = deck.meta.author ?? BRAND.name
pres.company = BRAND.name
pres.theme = { headFontFace: FONT.head, bodyFontFace: FONT.body }
setNumerals(deck.meta.numerals)
defineLayouts(pres)

const sectionCount = deck.slides.filter((s) => s.type === 'section').length
const ctx = {
  pres, deck, n: 0, sectionNo: 0, sectionTitle: null, sectionName: deck.meta.opening ?? 'الافتتاح',
  slide: (master) => pres.addSlide({ masterName: master, sectionTitle: ctx.sectionName }),
  sectionCount,
}
pres.addSection({ title: ctx.sectionName })
for (const s of deck.slides) {
  ctx.n++
  if (s.type === 'section') {
    ctx.sectionNo++
    ctx.sectionTitle = s.title
    ctx.sectionName = s.title
    pres.addSection({ title: s.title })
  } else if (s.type === 'closing' && deck.meta.closingSection !== false) {
    ctx.sectionName = 'الختام'
    pres.addSection({ title: ctx.sectionName })
  }
  RENDER[s.type](ctx, s)
}

mkdirSync(outDir, { recursive: true })
const out = join(outDir, `${fileBase}.pptx`)
await pres.writeFile({ fileName: out })
await finalize(out, { potx: asTemplate ? join(outDir, `${fileBase}.potx`) : null, moves: MOVES })
console.log(`◆ ${deck.slides.length} شريحة ← ${out}${asTemplate ? ' (+ ‎.potx)' : ''}`)
