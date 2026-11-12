#!/usr/bin/env node
// ═══ لوحةُ الهويّة — صورةُ العيّنة لشريحة «صورة ونصّ» ═══
// شبكةٌ من معيّنات الرمز نفسِه (مسارُ D_DIAMOND من Logo.tsx) بدرجات الليل، ومعيّنٌ واحدٌ ذهبيّ مضيء:
// «الذهبُ نادرٌ فيُرى» مرسومًا. تُصيَّر بمتصفّح Playwright المثبَّت إلى ‎content/assets/plate.jpg‎.
// الاستعمال: node src/plate.mjs

import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { C } from './brand.mjs'
import { LOGO } from './identity.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../content/assets/plate.jpg')

// اللوحةُ بنسبة خانة الصورة في التخطيط (٦٫١ × ٧٫٥ بوصة)
const W = 1220, H = 1500
const b = LOGO.box.mark
const step = 150 // تباعدُ الشبكة (بكسل CSS)
const lit = { c: 4, r: 8 } // موضعُ المعيّن الذهبيّ في الشبكة
let cells = ''
for (let r = -1; r <= Math.ceil(H / (step / 2)) + 1; r++) {
  for (let c = -1; c <= Math.ceil(W / step) + 1; c++) {
    const cx = c * step + (r % 2 ? step / 2 : 0), cy = r * (step / 2)
    const isLit = c === lit.c && r === lit.r
    const dx = (cx - (lit.c * step)) / W, dy = (cy - lit.r * (step / 2)) / H
    const near = Math.max(0, 1 - Math.hypot(dx, dy) * 1.6) // يقترب من الذهب فيُضاء قليلًا
    const fill = isLit ? '#' + C.gold : near > 0.55 ? '#' + C.night3 : '#' + C.night2
    const op = isLit ? 1 : 0.5 + near * 0.5
    const s = 88 / b.w
    cells += `<path d="${LOGO.diamond}" fill="${fill}" opacity="${op.toFixed(3)}" transform="translate(${cx} ${cy}) scale(${s}) translate(${-(b.x + b.w / 2)} ${-(b.y + b.h / 2)})"/>`
  }
}
const gx = lit.c * step, gy = lit.r * (step / 2)
const html = `<!doctype html><html><body style="margin:0;background:#${C.night}">
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <radialGradient id="g" cx="${gx}" cy="${gy}" r="${W * 0.62}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#${C.gold}" stop-opacity=".30"/><stop offset=".35" stop-color="#${C.gold}" stop-opacity=".09"/><stop offset="1" stop-color="#${C.gold}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#${C.night}" stop-opacity="0"/><stop offset="1" stop-color="#${C.night}" stop-opacity=".85"/></linearGradient>
</defs>
<rect width="100%" height="100%" fill="#${C.night}"/>
${cells}
<rect width="100%" height="100%" fill="url(#g)"/>
<rect width="100%" height="100%" fill="url(#v)"/>
</svg></body></html>`

mkdirSync(dirname(OUT), { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1.5 })
await page.setContent(html)
await page.screenshot({ path: OUT, type: 'jpeg', quality: 90 })
await browser.close()
console.log('◆ ' + OUT)
