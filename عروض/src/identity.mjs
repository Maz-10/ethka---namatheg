// ═══ الهويّة — الشعارُ والرمزُ والمعيّن أشكالًا متجهيّة أصيلة في باوربوينت ═══
// **الرسمُ يُقرأ من مصدره الواحد** `app/src/components/Logo.tsx` (وهو منقولٌ حرفيًّا من ملف الهوية
// `project/uploads/هوية-إذكاء/الشعار الأفقي/إذكاء-أفقي-ملون.svg`) — لا نسخةَ ثانيةً للمسارات هنا،
// ولا صورةَ نقطيّة: الشكلُ يُرسم في باوربوينت متجهًا فيبقى حادًّا في كل مقاس، ويُلوَّن حبرُه بلون سطحه
// (أسود الملف على الفاتح، وأبيضُه على الداكن) كما يفعل المكوّنُ نفسُه في المنصّة.

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
// في مستودع المنصّة يُقرأ المصدرُ نفسُه؛ وخارجه نسخةٌ مُودَعة منه (`identity/Logo.tsx` — تُحدَّث منه لا بيدٍ ثانية)
const LOGO_SRC = [resolve(HERE, '../../app/src/components/Logo.tsx'), resolve(HERE, '../identity/Logo.tsx')].find(existsSync)

function readLogo() {
  const src = readFileSync(LOGO_SRC, 'utf8')
  const path = (name) => {
    const m = src.match(new RegExp(`const ${name} = '([^']+)'`))
    if (!m) throw new Error(`تعذّر قراءة ${name} من Logo.tsx — هل تغيّر اسمُه؟`)
    return m[1]
  }
  const box = (name) => {
    const m = src.match(new RegExp(`${name}: \\{ x: (-?[\\d.]+), y: (-?[\\d.]+), w: ([\\d.]+), h: ([\\d.]+) \\}`))
    if (!m) throw new Error(`تعذّر قراءة صندوق ${name} من Logo.tsx`)
    const [x, y, w, h] = m.slice(1).map(Number)
    return { x, y, w, h }
  }
  return {
    name: path('D_NAME'),
    nameGold: path('D_NAME_GOLD'),
    dots: path('D_DOTS'),
    diamond: path('D_DIAMOND'),
    box: { lockup: box('lockup'), emblem: box('emblem'), mark: box('mark') },
  }
}

export const LOGO = readLogo()

/** محلّلُ مسار SVG — يكفي ما في ملف الهوية (أوامرُ مطلقة ونسبيّة: M L H V C Q Z). يُخرج مساراتٍ فرعية،
 *  كلٌّ قائمةُ أوامر بإحداثيّاتٍ مطلقة. */
export function parsePath(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g)
  const subs = []
  let cur = null, cmd = null, i = 0, x = 0, y = 0, sx = 0, sy = 0
  const num = () => Number(tokens[i++])
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++]
    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()
    if (C === 'Z') { if (cur) cur.push({ t: 'Z' }); x = sx; y = sy; continue }
    if (C === 'M') {
      x = (rel ? x : 0) + num(); y = (rel ? y : 0) + num(); sx = x; sy = y
      cur = [{ t: 'M', x, y }]; subs.push(cur)
      cmd = rel ? 'l' : 'L' // أزواجٌ تالية بعد M هي L ضمنًا
    } else if (C === 'L') {
      x = (rel ? x : 0) + num(); y = (rel ? y : 0) + num(); cur.push({ t: 'L', x, y })
    } else if (C === 'H') {
      x = (rel ? x : 0) + num(); cur.push({ t: 'L', x, y })
    } else if (C === 'V') {
      y = (rel ? y : 0) + num(); cur.push({ t: 'L', x, y })
    } else if (C === 'C') {
      const ox = rel ? x : 0, oy = rel ? y : 0
      const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num()
      x = ox + num(); y = oy + num(); cur.push({ t: 'C', x1, y1, x2, y2, x, y })
    } else if (C === 'Q') {
      const ox = rel ? x : 0, oy = rel ? y : 0
      const x1 = ox + num(), y1 = oy + num()
      x = ox + num(); y = oy + num(); cur.push({ t: 'Q', x1, y1, x, y })
    } else {
      throw new Error(`أمرُ مسارٍ غيرُ مدعوم: ${cmd}`)
    }
  }
  return subs
}

const EMU = 914400
const K = 100 // دقّةُ وحدات المسار (جزءٌ من مئةٍ من وحدة الملف)

/** مسارٌ فرعيٌّ واحد ← `<a:path>`؛ وكلُّ مسارٍ فرعيٍّ عنصرٌ مستقلّ فيُملأ وحده — فلا تتوقّف
 *  الصحّةُ على قاعدة الملء (زوجيّ/غيرُ صفريّ) التي يختلف فيها المحرّكان. وهذا آمنٌ لأن الملف بلا
 *  ثقوب: يجزمه `holes()` أدناه في كل بناء. */
function subpathXml(sub, box) {
  const X = (v) => Math.round((v - box.x) * K)
  const Y = (v) => Math.round((v - box.y) * K)
  const pt = (x, y) => `<a:pt x="${X(x)}" y="${Y(y)}"/>`
  let s = `<a:path w="${Math.round(box.w * K)}" h="${Math.round(box.h * K)}">`
  for (const c of sub) {
    if (c.t === 'M') s += `<a:moveTo>${pt(c.x, c.y)}</a:moveTo>`
    else if (c.t === 'L') s += `<a:lnTo>${pt(c.x, c.y)}</a:lnTo>`
    else if (c.t === 'C') s += `<a:cubicBezTo>${pt(c.x1, c.y1)}${pt(c.x2, c.y2)}${pt(c.x, c.y)}</a:cubicBezTo>`
    else if (c.t === 'Q') s += `<a:quadBezTo>${pt(c.x1, c.y1)}${pt(c.x, c.y)}</a:quadBezTo>`
    else if (c.t === 'Z') s += '<a:close/>'
  }
  return s + '</a:path>'
}

/** طبقةٌ واحدة (لونٌ واحد) ← شكلٌ متجهيّ `<p:sp>` في صندوق العرض المعطى. */
function layerXml({ id, name, d, box, x, y, w, h, color, rot = 0 }) {
  const subs = parsePath(d)
  const off = `<a:off x="${Math.round(x * EMU)}" y="${Math.round(y * EMU)}"/>`
  const ext = `<a:ext cx="${Math.round(w * EMU)}" cy="${Math.round(h * EMU)}"/>`
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}" descr="${BRAND_DESCR}"/><p:cNvSpPr><a:spLocks noTextEdit="1"/></p:cNvSpPr><p:nvPr userDrawn="1"/></p:nvSpPr>` +
    `<p:spPr><a:xfrm${rot ? ` rot="${Math.round(rot * 60000)}"` : ''}>${off}${ext}</a:xfrm><a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/>` +
    `<a:pathLst>${subs.map((s) => subpathXml(s, box)).join('')}</a:pathLst></a:custGeom>` +
    `${fillXml(color)}<a:ln><a:noFill/></a:ln></p:spPr>` +
    `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="ar-SA"/></a:p></p:txBody></p:sp>`
}

const BRAND_DESCR = 'شعار إذكاء'

/** تعبئةٌ صلبة، أو بشفافيّة إن جاءت `{hex, alpha}`. */
export function fillXml(color) {
  if (typeof color === 'string') return `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`
  return `<a:solidFill><a:srgbClr val="${color.hex}"><a:alpha val="${Math.round(color.alpha * 1000)}"/></a:srgbClr></a:solidFill>`
}

/** التراكيبُ الثلاثة (أسماءُ صناديق Logo.tsx): `lockup` الشعارُ كاملًا · `emblem` الرمزُ بنقاطه الثلاث ·
 *  `mark` المعيّنُ وحده. `ink` لونُ الحبر (الاسمُ والنقطتان السفليّتان) و`gold` لونُ الذهب. */
export function brandXml(kind, { x, y, w, ink, gold, idBase = 9000, name = 'EK' }) {
  const box = LOGO.box[kind]
  const h = (w * box.h) / box.w
  const layers = {
    lockup: [['name', LOGO.name, ink], ['nameGold', LOGO.nameGold, gold], ['dots', LOGO.dots, ink], ['diamond', LOGO.diamond, gold]],
    emblem: [['dots', LOGO.dots, ink], ['diamond', LOGO.diamond, gold]],
    mark: [['diamond', LOGO.diamond, gold]],
  }[kind]
  const parts = layers.filter(([, , color]) => color != null)
  const inner = parts.map(([part, d, color], k) =>
    layerXml({ id: idBase + k + 1, name: `${name}-${part}`, d, box, x, y, w, h, color })).join('')
  // مجموعةٌ واحدة تُنقل وتُكبَّر كتلةً — فلا تنفكّ طبقاتُ الشعار تحت يد المستخدم.
  const off = `<a:off x="${Math.round(x * EMU)}" y="${Math.round(y * EMU)}"/><a:ext cx="${Math.round(w * EMU)}" cy="${Math.round(h * EMU)}"/>`
  return `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="${idBase}" name="${name}" descr="${BRAND_DESCR}"/><p:cNvGrpSpPr><a:grpSpLocks noChangeAspect="1"/></p:cNvGrpSpPr><p:nvPr userDrawn="1"/></p:nvGrpSpPr>` +
    `<p:grpSpPr><a:xfrm>${off}<a:chOff x="${Math.round(x * EMU)}" y="${Math.round(y * EMU)}"/><a:chExt cx="${Math.round(w * EMU)}" cy="${Math.round(h * EMU)}"/></a:xfrm></p:grpSpPr>${inner}</p:grpSp>`
}

/** ارتفاعُ تركيبٍ بعرضٍ معطى — للحساب قبل الرسم. */
export const heightOf = (kind, w) => (w * LOGO.box[kind].h) / LOGO.box[kind].w

/** جزمٌ في كل بناء: لا مسارَ فرعيًّا داخل آخر في أيّ طبقة (فلا ثقبَ يسدّه الملءُ المنفصل). */
export function assertNoHoles() {
  const flat = (sub) => {
    const pts = []
    let px = 0, py = 0
    for (const c of sub) {
      if (c.t === 'M' || c.t === 'L') { pts.push([c.x, c.y]); px = c.x; py = c.y }
      else if (c.t === 'C' || c.t === 'Q') {
        for (let s = 1; s <= 8; s++) {
          const t = s / 8, u = 1 - t
          const [x1, y1, x2, y2] = c.t === 'C' ? [c.x1, c.y1, c.x2, c.y2] : [c.x1, c.y1, c.x1, c.y1]
          pts.push([u ** 3 * px + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * c.x,
            u ** 3 * py + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * c.y])
        }
        px = c.x; py = c.y
      }
    }
    return pts
  }
  const inside = ([x, y], poly) => {
    let r = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j]
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r
    }
    return r
  }
  for (const d of [LOGO.name, LOGO.nameGold, LOGO.dots, LOGO.diamond]) {
    const polys = parsePath(d).map(flat)
    polys.forEach((a, i) => polys.forEach((b, j) => {
      if (i !== j && a.every((p) => inside(p, b))) throw new Error('في الشعار مسارٌ فرعيٌّ داخل آخر — الملءُ المنفصل سيسدّ ثقبه')
    }))
  }
}
