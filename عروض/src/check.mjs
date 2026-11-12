#!/usr/bin/env node
// ═══ حارسُ الهيئة — يبني العيّنةَ واختبارَ الحالات في مجلّدٍ مؤقّت ويجزم ما لا يُرى بالعين ═══
// الاستعمال: npm run check   (المراجعةُ البصريّة بعده شرطٌ لا يُغني عنه — انظر README)

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import { C, FONT } from './brand.mjs'
import { LAYOUT_COUNT } from './layouts.mjs'
import { RENDER } from './slides.mjs'
import { assertNoHoles } from './identity.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let fails = 0, passes = 0
const check = (label, ok) => { if (ok) passes++; else { fails++; console.error('✗ ' + label) } }

assertNoHoles()
check('الشعارُ يُقرأ من Logo.tsx بلا ثقوب', true)

// العيّنةُ تمرّ بكل نوع: لا نوعَ بلا مثالٍ مرئيّ يُراجَع
const specimen = JSON.parse(readFileSync(join(ROOT, 'content/specimen.json'), 'utf8'))
const used = new Set(specimen.slides.map((s) => s.type))
for (const t of Object.keys(RENDER)) check(`العيّنةُ تعرض النوع «${t}»`, used.has(t))

const out = mkdtempSync(join(tmpdir(), 'ethka-deck-'))
for (const content of ['content/specimen.json', 'content/variants.json']) {
  execFileSync(process.execPath, [join(ROOT, 'src/build.mjs'), join(ROOT, content), '--out', out, '--template'], { stdio: 'pipe' })
}
for (const f of readdirSync(out).filter((f) => f.endsWith('.pptx') || f.endsWith('.potx'))) {
  const zip = await JSZip.loadAsync(readFileSync(join(out, f)))
  const names = Object.keys(zip.files)
  const text = async (n) => zip.file(n).async('string')
  check(`${f}: لا مداخلَ مجلّدات في الحزمة`, names.every((n) => !zip.files[n].dir))
  const ct = await text('[Content_Types].xml')
  check(`${f}: نوعُ المحتوى يطابق الامتداد`, f.endsWith('.potx') ? ct.includes('template.main+xml') : ct.includes('presentation.main+xml'))
  const theme = await text('ppt/theme/theme1.xml')
  check(`${f}: السمةُ بألوان الهويّة`, [C.ink, C.paper, C.night, C.cream, C.gold].every((c) => theme.includes(`val="${c}"`)))
  check(`${f}: السمةُ بخطَّي ثمانية للعربية واللاتينية`, theme.includes(`<a:cs typeface="${FONT.head}"/>`) && theme.includes(`<a:cs typeface="${FONT.body}"/>`))
  const master = await text('ppt/slideMasters/slideMaster1.xml')
  check(`${f}: القالبُ الرئيسيّ من اليمين`, !/<p:txStyles>[\s\S]*rtl="0"[\s\S]*<\/p:txStyles>/.test(master))
  const layouts = await Promise.all(names.filter((n) => /slideLayouts\/slideLayout\d+\.xml$/.test(n)).map(text))
  const lnames = layouts.map((x) => (x.match(/<p:cSld name="([^"]+)"/) ?? [])[1])
  check(`${f}: التخطيطاتُ كلّها باسم الهيئة`, lnames.length === LAYOUT_COUNT && lnames.every((n) => n?.startsWith('إذكاء ◆')))
  const slides = await Promise.all(names.filter((n) => /ppt\/slides\/slide\d+\.xml$/.test(n)).map(text))
  const all = [...slides, ...layouts].join('')
  check(`${f}: لا علامةَ \`EK:\` باقية`, !all.includes('name="EK:'))
  check(`${f}: الشعارُ متجهٌ أصيل (custGeom)`, all.includes('name="شعار إذكاء"') && all.includes('<a:custGeom>'))
  check(`${f}: لا خانةَ فارغة في شريحة`, slides.every((x) => !(x.match(/<p:sp>[\s\S]*?<\/p:sp>/g) ?? []).some((sp) => /<p:ph[\s/>]/.test(sp) && !/<a:r>|<a:fld /.test(sp))))
  check(`${f}: لا نقطةَ «◆» بخطٍّ لا يحويها`, !all.includes('char="&#x25C6;"') && !all.includes('char="◆"'))
  check(`${f}: لا جدولَ بعلامة اتّجاهٍ تقلب الترتيبَ ثانية`, !all.includes('<a:tblPr rtl="1"'))
}
console.log(`${fails ? '✗' : '◆'} هيئة العروض: ${passes} جزمًا${fails ? ` · ${fails} إخفاقًا` : ' — كلُّها خضراء'}  (${out})`)
process.exit(fails ? 1 : 0)
