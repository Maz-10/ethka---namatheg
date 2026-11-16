#!/usr/bin/env node
// ═══ قالبُ صور إذكاء — المولِّد ═══
// ملفُّ صور ← كلُّ صورةٍ مركّبةً في لوح إذكاء (frame.mjs)، بعد أن تُقرأ (smart.mjs).
// الاستعمال:  node src/build.mjs content/liqa-1.json [--out dist] [--tone ورق|ليل|ورق,ليل]

import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, dirname, extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { TONES, plate, html } from './frame.mjs'
import { read, levels, veil } from './smart.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const args = process.argv.slice(2)
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null }
const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
if (!file) { console.error('الاستعمال: node src/build.mjs content/<اللقاء>.json [--out dist] [--tone ورق|ليل]'); process.exit(1) }
const CONTENT = resolve(file)
const BASE = dirname(CONTENT)
const doc = JSON.parse(readFileSync(CONTENT, 'utf8'))
const OUT = resolve(opt('out') || resolve(BASE, '../dist'), doc.meta.file)
const tones = (opt('tone') || doc.meta.tone || 'ورق').split(',')
for (const t of tones) if (!TONES[t]) throw new Error(`نغمةٌ غيرُ معروفة: «${t}» — المتاح: ${Object.keys(TONES).join('، ')}`)
mkdirSync(OUT, { recursive: true })

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
const browser = await chromium.launch()
const page = await browser.newPage()
const tmp = mkdtempSync(join(tmpdir(), 'ethka-photo-'))
const report = []

for (const [i, p] of doc.photos.entries()) {
  const src = resolve(BASE, p.src)
  const an = await read(page, `data:${MIME[extname(src).toLowerCase()] || 'image/jpeg'};base64,` + readFileSync(src).toString('base64'))
  const g = plate(an)
  const v = veil(an)
  const look = { levels: levels(an), veil: p.veil ?? v.strength }
  const nn = String(i + 1).padStart(2, '0')

  for (const tone of tones) {
    const name = `${doc.meta.file}-${nn}${tones.length > 1 || tone !== 'ورق' ? '-' + tone : ''}.jpg`
    const htmlFile = join(tmp, `${nn}-${tone}.html`)
    writeFileSync(htmlFile, html({ photo: pathToFileURL(src).href, g, look, tone }))
    const ctx = await browser.newContext({ viewport: { width: g.W, height: g.H }, deviceScaleFactor: g.dpr })
    const shot = await ctx.newPage()
    await shot.goto(pathToFileURL(htmlFile).href)
    await shot.evaluate(() => Promise.all([...document.images].map((im) => im.decode())))
    await shot.screenshot({ path: join(OUT, name), type: 'jpeg', quality: 93 })
    await ctx.close()

    const size = `${Math.round(g.W * g.dpr)}×${Math.round(g.H * g.dpr)}`
    report.push({
      ملف: name, مقاس: size, نغمة: tone,
      الصورة: { أصل: `${an.W}×${an.H}`, معروضة: `${Math.round(g.pw * g.dpr)}×${Math.round(g.ph * g.dpr)}` },
      غشاء: { شدّة: look.veil, مسحة: v.cast }, مستويات: look.levels,
    })
    console.log(`◆ ${name}  ${size}  غشاء=${look.veil} (مسحة ${v.cast})  مستويات×${look.levels.slope}`)
  }
}

await browser.close()
rmSync(tmp, { recursive: true, force: true })
writeFileSync(join(OUT, 'القرارات.json'), JSON.stringify(report, null, 2) + '\n')
console.log(`\n${report.length} صورة في ${OUT}`)
