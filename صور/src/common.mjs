// ═══ ما تشترك فيه الأنماطُ الثلاثة ═══
// الألوانُ من `../عروض/src/brand.mjs` والأشكالُ من الشعار نفسِه (`identity.mjs`) — لا قيمةَ مُرتجلة.

import { C } from '../../عروض/src/brand.mjs'
import { LOGO, parsePath } from '../../عروض/src/identity.mjs'

export { C, LOGO }
export const hex = (h) => '#' + h
export const rgba = (h, a) => `rgba(${[0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',')},${a})`
export const f = (n) => +n.toFixed(2)

/** صناديقُ أجزاء الشعار في فضائه (مقيسةٌ من مساراته): المعيّنُ الذهبيّ، والنقطتان، واسمُ «إذكاء» وحده. */
const bounds = (sub) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const c of sub) for (const [x, y] of [[c.x, c.y], [c.x1, c.y1], [c.x2, c.y2]]) {
    if (x == null) continue
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }
}
const [dotA, dotB] = parsePath(LOGO.dots).map(bounds).sort((a, b) => a.cx - b.cx)
const nameParts = [...parsePath(LOGO.name), ...parsePath(LOGO.nameGold)].map(bounds)
export const PARTS = {
  gem: bounds(parsePath(LOGO.diamond)[0]),
  dotLeft: dotA, dotRight: dotB,
  name: (() => {
    const x0 = Math.min(...nameParts.map((b) => b.x)), y0 = Math.min(...nameParts.map((b) => b.y))
    const x1 = Math.max(...nameParts.map((b) => b.x + b.w)), y1 = Math.max(...nameParts.map((b) => b.y + b.h))
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  })(),
}

/** يحوّل مسارًا من فضاء الشعار إلى بكسلات الصفحة: `(x, y)` ← `(ox + s·(x − ax), oy + s·(y − ay))`. */
export function place(d, { s, ax, ay, ox, oy }) {
  const X = (v) => f(ox + s * (v - ax)), Y = (v) => f(oy + s * (v - ay))
  return parsePath(d).map((sub) => sub.map((c) => {
    if (c.t === 'M') return `M${X(c.x)} ${Y(c.y)}`
    if (c.t === 'L') return `L${X(c.x)} ${Y(c.y)}`
    if (c.t === 'C') return `C${X(c.x1)} ${Y(c.y1)} ${X(c.x2)} ${Y(c.y2)} ${X(c.x)} ${Y(c.y)}`
    if (c.t === 'Q') return `Q${X(c.x1)} ${Y(c.y1)} ${X(c.x)} ${Y(c.y)}`
    return 'Z'
  }).join('')).join('')
}

/** يقتطع مسارًا فرعيًّا واحدًا (بترتيبه) من مسار. */
export const subpath = (d, i) => {
  const subs = d.match(/M[^M]*/g)
  return subs[i]
}

/** الشعارُ كاملًا (أبيضُ الحبر ذهبيُّ المعيّن) بعرضٍ معطى. */
export function lockup(w, { ink = C.white } = {}) {
  const L = LOGO.box.lockup
  return `<svg viewBox="${L.x} ${L.y} ${L.w} ${L.h}" width="${f(w)}" height="${f((w * L.h) / L.w)}" role="img" aria-label="إذكاء" style="display:block">
  <path d="${LOGO.name}" fill="${hex(ink)}"/><path d="${LOGO.dots}" fill="${hex(ink)}"/>
  <path d="${LOGO.nameGold}" fill="${hex(C.gold)}"/><path d="${LOGO.diamond}" fill="${hex(C.gold)}"/></svg>`
}

/** اسمُ «إذكاء» وحده (بلا رمز) بعرضٍ معطى — حين يكون الرمزُ نفسُه هو الشكلَ الكبير. */
export function wordmark(w, { ink = C.white } = {}) {
  const n = PARTS.name
  return `<svg viewBox="${f(n.x)} ${f(n.y)} ${f(n.w)} ${f(n.h)}" width="${f(w)}" height="${f((w * n.h) / n.w)}" role="img" aria-label="إذكاء" style="display:block">
  <path d="${LOGO.name}" fill="${hex(ink)}"/><path d="${LOGO.nameGold}" fill="${hex(C.gold)}"/></svg>`
}

/** رأسُ الصفحة: الأبعاد، والصورةُ بمستوياتها. */
export function head(pg, look, css = '') {
  const lv = `type="linear" slope="${look.levels.slope}" intercept="${look.levels.intercept}"`
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${pg.W}px;height:${pg.H}px;overflow:hidden;background:${hex(C.night)}}
body{position:relative}
img.ph{position:absolute;inset:0;width:100%;height:100%;filter:url(#lv)}
${css}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><filter id="lv" color-interpolation-filters="sRGB"><feComponentTransfer>
  <feFuncR ${lv}/><feFuncG ${lv}/><feFuncB ${lv}/></feComponentTransfer></filter></svg>`
}
