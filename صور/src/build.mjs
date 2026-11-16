#!/usr/bin/env node
// ═══ قالبُ صور إذكاء — المولِّد ═══
// ملفُّ صور ← كلُّ صورةٍ عليها هويّةُ إذكاء وحدها (الموجةُ والمعيّنُ والشعار)، بلا كلام.
// الاستعمال:  node src/build.mjs content/liqa-1.json [--out dist] [--only الأصل,عمودي]
// والإطارُ لا يُلصق كما هو: تُقرأ الصورةُ أوّلًا (smart.mjs) ثم تُؤطَّر بما تقتضيه.

import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, dirname, extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { FORMATS, resolveFormat, photoBox, scrimZone, html } from './frame.mjs'
import { read, crop, region, levels, scrim } from './smart.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const args = process.argv.slice(2)
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null }
const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
if (!file) { console.error('الاستعمال: node src/build.mjs content/<اللقاء>.json [--out dist] [--only الأصل,أفقي,عمودي,قصة]'); process.exit(1) }
const CONTENT = resolve(file)
const BASE = dirname(CONTENT)
const doc = JSON.parse(readFileSync(CONTENT, 'utf8'))
const OUT = resolve(opt('out') || resolve(BASE, '../dist'), doc.meta.file)
const only = (opt('only') || (doc.formats || ['الأصل']).join(',')).split(',')
for (const k of only) if (!FORMATS[k]) throw new Error(`مقاسٌ غيرُ معروف: «${k}» — المتاح: ${Object.keys(FORMATS).join('، ')}`)
mkdirSync(OUT, { recursive: true })

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
const browser = await chromium.launch()
const page = await browser.newPage()
const tmp = mkdtempSync(join(tmpdir(), 'ethka-photo-'))
const report = []

for (const [i, p] of doc.photos.entries()) {
  const src = resolve(BASE, p.src)
  const data = `data:${MIME[extname(src).toLowerCase()] || 'image/jpeg'};base64,` + readFileSync(src).toString('base64')
  const an = await read(page, data)
  const lv = levels(an)
  const nn = String(i + 1).padStart(2, '0')

  for (const k of only) {
    const F = resolveFormat(FORMATS[k], an)
    const box = photoBox(F)
    // سقفُ التقريب: ألّا تقلّ نافذةُ الاقتطاع عن ٩٠٪ من بكسلات المخرج
    const win = an.W / an.H > box.aspect ? an.H * box.aspect : an.W
    const maxZoom = F.whole ? 1 : Math.min(1.35, Math.max(1, win / (0.9 * F.W * F.dpr)))
    const cut = crop(an, box, { focus: p.focus, zoom: p.zoom, maxZoom })
    const look = { levels: lv, scrim: scrim(region(an, cut, scrimZone(F))) }

    const htmlFile = join(tmp, `${nn}-${k}.html`)
    writeFileSync(htmlFile, html(F, { photo: pathToFileURL(src).href, cut, look }))
    const ctx = await browser.newContext({ viewport: { width: F.W, height: F.H }, deviceScaleFactor: F.dpr })
    const shot = await ctx.newPage()
    await shot.goto(pathToFileURL(htmlFile).href)
    await shot.evaluate(() => Promise.all([...document.images].map((im) => im.decode())))
    const name = `${doc.meta.file}-${nn}-${k}.jpg`
    await shot.screenshot({ path: join(OUT, name), type: 'jpeg', quality: 92 })
    await ctx.close()

    const size = `${Math.round(F.W * F.dpr)}×${Math.round(F.H * F.dpr)}`
    report.push({
      ملف: name, مقاس: size, لـ: F.use,
      اقتطاع: { بـ: cut.by, تكبير: +(cut.zoom || 1).toFixed(2), س: +cut.x.toFixed(3), ص: +cut.y.toFixed(3), عرض: +cut.w.toFixed(3), ارتفاع: +cut.h.toFixed(3) },
      تعتيم: look.scrim, مستويات: lv,
    })
    console.log(`◆ ${name}  ${size}  اقتطاع(${cut.by}) ×${(cut.zoom || 1).toFixed(2)}  تعتيم=${look.scrim}`)
  }
}

await browser.close()
rmSync(tmp, { recursive: true, force: true })
writeFileSync(join(OUT, 'القرارات.json'), JSON.stringify(report, null, 2) + '\n')
console.log(`\n${report.length} صورة في ${OUT}`)
