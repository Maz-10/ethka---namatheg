// ═══ التشطيب — ما لا يكتبه pptxgenjs يُكتب هنا في الملف نفسه ═══
// ١) السمة: ألوانُ الهوية وخطّا ثمانية (للعربية واللاتينية معًا) فيرثها كلُّ ما يُكتب يدويًّا.
// ٢) أنماطُ القالب الرئيسيّ: من اليمين إلى اليسار افتراضًا، ونقطةُ القائمة معيّنٌ ذهبيّ.
// ٣) العلاماتُ `EK:` تُستبدل بأشكال الهويّة المتجهيّة (`identity.mjs`)، و`EKPH:` تُجري خانةً إلى موضعها
//    في شريحتها (ما تحت العنوان يتبع عددَ أسطره)، ونقطةُ «◆» تصير معيّنَ Wingdings الذهبيّ (الخطُّ لا يحويها).
// ٤) نصُّ الرسوم بخطّ العربية (والجداولُ تُرصف من اليمين في `slides.mjs` نفسِه).
// ٥) نسخةُ قالبٍ ‎.potx‎ إن طُلبت: الملفُّ نفسُه بنوع محتوى «قالب».

import JSZip from 'jszip'
import { readFileSync, writeFileSync } from 'node:fs'
import { C, FONT, BRAND } from './brand.mjs'
import { brandXml, assertNoHoles } from './identity.mjs'
import { PH_REG } from './layouts.mjs'

const EMU = 914400

const THEME_COLORS = `<a:clrScheme name="${BRAND.name}">` +
  `<a:dk1><a:srgbClr val="${C.ink}"/></a:dk1><a:lt1><a:srgbClr val="${C.paper}"/></a:lt1>` +
  `<a:dk2><a:srgbClr val="${C.night}"/></a:dk2><a:lt2><a:srgbClr val="${C.cream}"/></a:lt2>` +
  `<a:accent1><a:srgbClr val="${C.gold}"/></a:accent1><a:accent2><a:srgbClr val="${C.goldInk}"/></a:accent2>` +
  `<a:accent3><a:srgbClr val="${C.ink2}"/></a:accent3><a:accent4><a:srgbClr val="${C.goldNight}"/></a:accent4>` +
  `<a:accent5><a:srgbClr val="${C.ok}"/></a:accent5><a:accent6><a:srgbClr val="${C.danger}"/></a:accent6>` +
  `<a:hlink><a:srgbClr val="${C.goldInk}"/></a:hlink><a:folHlink><a:srgbClr val="${C.ink2}"/></a:folHlink></a:clrScheme>`

const fontSet = (f) => `<a:latin typeface="${f}"/><a:ea typeface=""/><a:cs typeface="${f}"/><a:font script="Arab" typeface="${f}"/>`
const THEME_FONTS = `<a:fontScheme name="${BRAND.name}"><a:majorFont>${fontSet(FONT.head)}</a:majorFont><a:minorFont>${fontSet(FONT.body)}</a:minorFont></a:fontScheme>`

function theme(xml) {
  return xml
    .replace(/<a:clrScheme[\s\S]*?<\/a:clrScheme>/, THEME_COLORS)
    .replace(/<a:fontScheme[\s\S]*?<\/a:fontScheme>/, THEME_FONTS)
    .replace(/(<a:theme [^>]*name=")[^"]*"/, `$1${BRAND.name}"`)
}

// القالبُ الرئيسيّ: كلُّ نصٍّ يُكتب يدويًّا في باوربوينت يبدأ عربيًّا من اليمين، والنقطةُ معيّنٌ ذهبيّ
const BULLET = `<a:buClr><a:srgbClr val="${C.gold}"/></a:buClr><a:buSzPct val="65000"/><a:buFont typeface="Wingdings" pitchFamily="2" charset="2"/><a:buChar char="u"/>`
function master(xml) {
  return xml.replace(/<p:txStyles>[\s\S]*<\/p:txStyles>/, (styles) => styles
    .replace(/algn="(l|ctr)"/g, 'algn="r"')
    .replace(/rtl="0"/g, 'rtl="1"')
    .replace(/(<a:lvl1pPr marL="342900"[^>]*>(?:<a:spcBef>[\s\S]*?<\/a:spcBef>)?)<a:buFont[^>]*\/><a:buChar char="[^"]*"\/>/, `$1${BULLET}`)
    .replace(/(<p:titleStyle>[\s\S]*?<a:defRPr sz=")4400"/, '$13000"'))
}

// ── العلامات
const box = (spXml) => {
  const off = spXml.match(/<a:off x="(-?\d+)" y="(-?\d+)"\/>/)
  const ext = spXml.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/)
  return { x: off[1] / EMU, y: off[2] / EMU, w: ext[1] / EMU, h: ext[2] / EMU }
}
// خانةٌ أُجريت في شريحتها: يُكتب موضعُها الرأسيّ وارتفاعُها (`MOVES` من المولِّد)
function moved(xml, moves) {
  for (const m of moves) {
    xml = xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, (sp) => !new RegExp(`<p:ph\\s[^>]*idx="${m.idx}"`).test(sp) ? sp : sp
      .replace(/(<a:off x="-?\d+") y="-?\d+"\/>/, `$1 y="${Math.round(m.y * EMU)}"/>`)
      .replace(/(<a:ext cx="\d+") cy="\d+"\/>/, `$1 cy="${Math.round(m.h * EMU)}"/>`))
  }
  return xml
}

function markers(xml) {
  let id = 4000
  let guard = 0
  for (;;) {
    const at = xml.indexOf('name="EK:')
    if (at < 0) return xml
    if (++guard > 500) throw new Error('حلقةٌ في استبدال العلامات')
    const start = xml.lastIndexOf('<p:sp>', at)
    const end = xml.indexOf('</p:sp>', at) + '</p:sp>'.length
    const sp = xml.slice(start, end)
    const [, kind, ink, gold] = sp.match(/name="EK:([a-z]+):([^:"]*):([^:"]*)"/)
    const b = box(sp)
    id += 20
    const out = brandXml(kind, { x: b.x, y: b.y, w: b.w, ink: ink === '-' ? null : ink, gold: gold === '-' ? null : gold, idBase: id, name: { lockup: 'شعار إذكاء', emblem: 'رمز إذكاء', mark: 'المعيّن' }[kind] })
    xml = xml.slice(0, start) + out + xml.slice(end)
  }
}

// خاناتُ التخطيط: بلا حشوٍ داخليّ وبمرساتها المصمَّمة (من سجلّ `PH_REG`)؛ والتخطيطُ الافتراضيّ الذي يضيفه
// pptxgenjs يُسمّى باسم الهيئة فلا يظهر «DEFAULT» في معرض التخطيطات.
function layout(xml) {
  xml = xml.replace('<p:cSld name="DEFAULT"', `<p:cSld name="${BRAND.name} ◆ ورقة بيضاء"`)
  const name = (xml.match(/<p:cSld name="([^"]+)"/) ?? [])[1]
  for (const { idx, anchor } of PH_REG[name] ?? []) {
    xml = xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, (sp) => !new RegExp(`<p:ph\\s[^>]*idx="${idx}"`).test(sp) ? sp
      : sp.replace(/<a:bodyPr wrap="square" rtlCol="0"><\/a:bodyPr>/, `<a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="1" anchor="${anchor}"/>`))
  }
  return xml
}

// نصُّ الرسوم: pptxgenjs يكتب الخطَّ اللاتينيّ وحده، والعربيةُ تُرسم بخطّ «النصّ المعقّد» — فيُضاف.
function chart(xml) {
  return xml
    .replace(/<a:latin typeface="([^"]+)"\/>(?!<a:ea)/g, '<a:latin typeface="$1"/><a:ea typeface="$1"/><a:cs typeface="$1"/>')
    .replace(/<a:pPr>(?=<a:defRPr)/g, '<a:pPr rtl="1">')
}

export async function finalize(file, { potx = null, moves = [] } = {}) {
  assertNoHoles()
  const zip = await JSZip.loadAsync(readFileSync(file))
  const names = Object.keys(zip.files)
  for (const n of names) {
    if (zip.files[n].dir || !n.endsWith('.xml')) continue
    let xml = await zip.file(n).async('string')
    const before = xml
    if (/^ppt\/theme\/theme\d+\.xml$/.test(n)) xml = theme(xml)
    if (/^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(n)) xml = master(xml)
    if (/^ppt\/(slides|slideLayouts)\/[^/]+\.xml$/.test(n)) {
      xml = markers(xml)
      const num = Number((n.match(/slides\/slide(\d+)\.xml$/) ?? [])[1])
      if (num) {
        xml = moved(xml, moves.filter((m) => m.slide === num))
        // خانةٌ لم تُملأ في الشريحة تُطرح (تبقى في التخطيط): نصُّ إرشادها كان يعلو المحتوى المركَّب أثناء التحرير
        xml = xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, (sp) => (/<p:ph[\s/>]/.test(sp) && !/<a:r>|<a:fld /.test(sp) ? '' : sp))
      }
      xml = xml.replace(/<a:buSzPct val="100000"\/><a:buChar char="(?:◆|&#x25C6;)"\/>/g, BULLET)
    }
    if (/^ppt\/slideLayouts\/[^/]+\.xml$/.test(n)) xml = layout(xml)
    if (/^ppt\/charts\/chart\d+\.xml$/.test(n)) xml = chart(xml)
    if (xml !== before) zip.file(n, xml)
  }
  // حزمةٌ بلا مداخل مجلّدات (تُفشل الفتحَ والتحرير المشترك عبر الخدمات السحابيّة)
  const pack = async (ctOverride) => {
    const out = new JSZip()
    for (const n of Object.keys(zip.files)) {
      if (zip.files[n].dir) continue
      out.file(n, n === '[Content_Types].xml' && ctOverride ? ctOverride : await zip.file(n).async('uint8array'), { createFolders: false })
    }
    return out.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })
  }
  writeFileSync(file, await pack())
  if (potx) {
    const ct = await zip.file('[Content_Types].xml').async('string')
    writeFileSync(potx, await pack(ct.replace('presentationml.presentation.main+xml', 'presentationml.template.main+xml')))
  }
}
