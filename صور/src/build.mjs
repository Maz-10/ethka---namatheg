#!/usr/bin/env node
// ═══ قالبُ صور إذكاء — المولِّد ═══
// ملفُّ صور ← كلُّ صورةٍ كاملةً وعليها الهويّةُ بأحد ثلاثة أنماط، بعد أن تُقرأ (smart.mjs):
//   تموج (frame.mjs) · زجاج (glass.mjs) · قصة (cut.mjs)
// الاستعمال:  node src/build.mjs content/liqa-1.json [--out dist] [--style غلاف,توقيع,تذهيب,تموج,زجاج,قصة]

import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, dirname, extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { page as pageOf, html as ripple } from './frame.mjs'
import { html as glass } from './glass.mjs'
import { html as cut } from './cut.mjs'
import * as cover from './cover.mjs'
import { sign, goldTone } from './sign.mjs'
import { read, corner, subjectMask, veil, levels } from './smart.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const args = process.argv.slice(2)
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null }
const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
if (!file) { console.error('الاستعمال: node src/build.mjs content/<اللقاء>.json [--out dist]'); process.exit(1) }
const CONTENT = resolve(file)
const BASE = dirname(CONTENT)
const doc = JSON.parse(readFileSync(CONTENT, 'utf8'))
const OUT = resolve(opt('out') || resolve(BASE, '../dist'), doc.meta.file)
mkdirSync(OUT, { recursive: true })
// النظام: غلاف (نافذةُ المعيّن) · توقيع (الصورةُ نقيّة) · تذهيب (معالجةُ الهويّة اللونيّة)؛ والأنماطُ الأولى باقيةٌ للاختيار
const STYLES = {
  'غلاف': cover, 'توقيع': { html: sign }, 'تذهيب': { html: goldTone },
  'تموج': { html: ripple }, 'زجاج': { html: glass }, 'قصة': { html: cut },
}
const styles = (opt('style') || doc.meta.style || 'غلاف,توقيع,تذهيب').split(',')
for (const st of styles) if (!STYLES[st]) throw new Error(`نمطٌ غيرُ معروف: «${st}» — المتاح: ${Object.keys(STYLES).join('، ')}`)

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
const browser = await chromium.launch()
const reader = await browser.newPage()
const tmp = mkdtempSync(join(tmpdir(), 'ethka-photo-'))
const report = []

for (const [i, p] of doc.photos.entries()) {
  const src = resolve(BASE, p.src)
  const an = await read(reader, `data:${MIME[extname(src).toLowerCase()] || 'image/jpeg'};base64,` + readFileSync(src).toString('base64'))
  const c = corner(an, p.corner)
  const pg = pageOf(an)
  const look = { veil: p.veil ?? veil(c), levels: levels(an) }
  const mask = subjectMask(an)
  for (const st of styles) {
    const name = `${doc.meta.file}-${String(i + 1).padStart(2, '0')}-${st}.jpg`
    const sp = STYLES[st].page ? STYLES[st].page(an) : pg
    const lk = { ...look }
    const htmlFile = join(tmp, `${i}-${st}.html`)
    writeFileSync(htmlFile, STYLES[st].html({ photo: pathToFileURL(src).href, pg: sp, c, mask, look: lk, an }))
    const ctx = await browser.newContext({ viewport: { width: sp.W, height: sp.H }, deviceScaleFactor: sp.dpr })
    const shot = await ctx.newPage()
    await shot.goto(pathToFileURL(htmlFile).href)
    await shot.evaluate(() => Promise.all([...document.images].map((im) => im.decode())))
    await shot.evaluate(() => window.__ready)
    await shot.screenshot({ path: join(OUT, name), type: 'jpeg', quality: 93 })
    await ctx.close()

    const size = `${Math.round(sp.W * sp.dpr)}×${Math.round(sp.H * sp.dpr)}`
    report.push({
      ملف: name, نمط: st, مقاس: size,
      زاوية: { اختيار: c.name, بـ: c.by, مركزُ_الموضوع: c.subject, المقارنة: c.all.map(({ name, busy, dist, lum }) => ({ name, حدّة: busy, بُعد: dist, سطوع: lum })) },
      غشاء: lk.veil, مستويات: lk.levels, ...(lk.ink ? { حبرُ_الشعار: lk.ink, سطوعُ_موضعه: lk.spot, ظلّ: lk.shade } : {}),
    })
    console.log(`◆ ${name}  ${size}  الزاوية: ${c.name}${lk.ink ? '  حبر=' + lk.ink + ' (سطوع ' + lk.spot + ')' : ''}`)
  }
}

await browser.close()
rmSync(tmp, { recursive: true, force: true })
writeFileSync(join(OUT, 'القرارات.json'), JSON.stringify(report, null, 2) + '\n')
console.log(`\n${report.length} صورة في ${OUT}`)
