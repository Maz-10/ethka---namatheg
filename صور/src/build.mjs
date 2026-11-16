#!/usr/bin/env node
// ═══ قالبُ صور إذكاء — المولِّد ═══
// ملفُّ محتوى (اللقاءُ وصورُه) ← لكلّ صورةٍ ثلاثةُ مقاساتٍ جاهزةٌ للنشر.
// الاستعمال:  node src/build.mjs content/liqa-1.json [--out dist] [--only أفقي,عمودي]
// والصورُ بلا إطارٍ ثابت: تُقرأ أوّلًا (smart.mjs) ثم تُؤطَّر بما تقتضيه.

import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, dirname, extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { FORMATS, photoBox, wave, html, fitInPage, ar } from './frame.mjs'
import { read, crop, region, levels, scrim } from './smart.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'))
if (!file) { console.error('الاستعمال: node src/build.mjs content/<اللقاء>.json [--out dist] [--only أفقي,عمودي,قصة]'); process.exit(1) }
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null }
const CONTENT = resolve(file)
const BASE = dirname(CONTENT)
const doc = JSON.parse(readFileSync(CONTENT, 'utf8'))
const OUT = resolve(opt('out') || resolve(BASE, '../dist'), doc.meta.file)
const only = (opt('only') || doc.formats?.join(',') || Object.keys(FORMATS).join(',')).split(',')
for (const k of only) if (!FORMATS[k]) throw new Error(`مقاسٌ غيرُ معروف: «${k}» — المتاح: ${Object.keys(FORMATS).join('، ')}`)
mkdirSync(OUT, { recursive: true })

const ev = doc.event
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

const browser = await chromium.launch()
const page = await browser.newPage()
const tmp = mkdtempSync(join(tmpdir(), 'ethka-photo-'))
const report = []
let warnings = 0

for (const [i, p] of doc.photos.entries()) {
  const src = resolve(BASE, p.src)
  const data = `data:${MIME[extname(src).toLowerCase()] || 'image/jpeg'};base64,` + readFileSync(src).toString('base64')
  const an = await read(page, data)
  const lv = levels(an)
  const n = i + 1, total = doc.photos.length
  const nn = String(n).padStart(2, '0')

  // النصّ: عنوانُ الصورة إن كُتب، وإلا عنوانُ اللقاء — والوسمُ يتبع ما ليس عنوانًا
  const text = {
    eyebrow: p.title ? `${ev.community} · ${ev.title}` : ev.community,
    head: p.title || ev.title,
    sub: p.text || ev.tagline || '',
    meta: [ev.date, ev.place].filter(Boolean),
  }

  for (const k of only) {
    const F = FORMATS[k]
    const box = photoBox(F)
    // سقفُ التقريب: ألّا تقلّ نافذةُ الاقتطاع عن ٩٠٪ من بكسلات المخرج
    const win = an.W / an.H > box.aspect ? an.H * box.aspect : an.W
    const maxZoom = Math.min(1.35, Math.max(1, win / (0.9 * F.W * F.dpr)))
    const cut = crop(an, box, { focus: p.focus, zoom: p.zoom, maxZoom })
    const wv = wave(F)
    // الشريطُ الذي يلي الموجةَ من الصورة (ربعُ الارتفاع فوق القمّة) — عليه تُقاس شدّةُ التعتيم
    const band = region(an, cut, { x: 0, y: Math.max(0, (wv.top - F.H * 0.24) / box.h), w: 1, h: Math.min(1, F.H * 0.24 / box.h) })
    const corner = region(an, cut, { x: 0, y: 0, w: 0.25, h: 0.15 })
    const look = { levels: lv, scrim: scrim(band), badge: +(0.38 + Math.max(0, corner.lum - 0.4) * 0.6).toFixed(2) }

    const htmlFile = join(tmp, `${nn}-${k}.html`)
    writeFileSync(htmlFile, html(F, { photo: pathToFileURL(src).href, cut, look, text, count: { n, total } }))
    await page.setViewportSize({ width: F.W, height: F.H })
    await page.goto(pathToFileURL(htmlFile).href)
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => Promise.all([...document.images].map((im) => im.decode())))
    const over = await page.evaluate(fitInPage)
    // الصورةُ بكثافة المقاس: لقطةٌ من صفحةٍ ثانية بكثافةٍ أعلى إن طُلبت
    const name = `${doc.meta.file}-${nn}-${k}.jpg`
    let shot = page
    if (F.dpr !== 1) {
      const ctx = await browser.newContext({ viewport: { width: F.W, height: F.H }, deviceScaleFactor: F.dpr })
      shot = await ctx.newPage()
      await shot.goto(pathToFileURL(htmlFile).href)
      await shot.evaluate(() => document.fonts.ready)
      await shot.evaluate(() => Promise.all([...document.images].map((im) => im.decode())))
      await shot.evaluate(fitInPage)
    }
    await shot.screenshot({ path: join(OUT, name), type: 'jpeg', quality: 92 })
    if (shot !== page) await shot.context().close()

    if (over.length) { warnings++; console.warn(`  ⚠ ${name}: فاض النصّ رغم التصغير — ${over.join(' | ')}`) }
    report.push({
      ملف: name, مقاس: `${Math.round(F.W * F.dpr)}×${Math.round(F.H * F.dpr)}`, لـ: F.use,
      اقتطاع: { بـ: cut.by, تكبير: +(cut.zoom || 1).toFixed(2), س: +cut.x.toFixed(3), ص: +cut.y.toFixed(3), عرض: +cut.w.toFixed(3), ارتفاع: +cut.h.toFixed(3) },
      تعتيم: look.scrim, مستويات: lv,
    })
    console.log(`◆ ${name}  ${Math.round(F.W * F.dpr)}×${Math.round(F.H * F.dpr)}  اقتطاع(${cut.by}) س=${cut.x.toFixed(2)} ص=${cut.y.toFixed(2)} ×${(cut.zoom || 1).toFixed(2)}  تعتيم=${look.scrim}`)
  }
}

await browser.close()
rmSync(tmp, { recursive: true, force: true })
writeFileSync(join(OUT, 'القرارات.json'), JSON.stringify(report, null, 2) + '\n')
console.log(`\n${ar(report.length)} صورة في ${OUT}${warnings ? ` — ${ar(warnings)} تنبيه` : ''}`)
if (warnings) process.exitCode = 2
