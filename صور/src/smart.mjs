// ═══ «الذكاء» — قراءةُ الصورة قبل أن يمسّها التموّج ═══
// تُقرأ الصورةُ أوّلًا فيُقرَّر لها:
//   ١) الزاوية — أهدأُ زوايا الصورة وأبعدُها عن موضوعها: فيها يُوضع الشعارُ ومنها ينطلق التموّج.
//   ٢) قناعُ الموضوع — خريطةُ حدّة: ما في بؤرة العدسة (المتحدّث والشاشة) حادٌّ، وما خارجها ضبابيّ.
//      فتخفت الحلقاتُ قبل أن تبلغ الموضوع ولا تمرّ على وجه.
//   ٣) شدّةُ الغشاء — يُقاس سطوعُ الزاوية فيشتدّ الظلُّ على الفاتح ويخفّ على الداكن.
//   ٤) المستويات — مدٌّ خفيف حول وسط الصورة نفسِها بسقف ١٢٪.
// والقراءةُ بمحرّك Chromium نفسِه الذي يرسم: تُفكّ الصورةُ في لوحٍ مصغَّر وتُحسب الخرائطُ هنا.

const AW = 480 // عرضُ لوح التحليل (بكسل)

async function decode(page, dataUrl) {
  return page.evaluate(async ({ src, AW }) => {
    const img = new Image()
    img.src = src
    await img.decode()
    const W = img.naturalWidth, H = img.naturalHeight
    const w = Math.min(AW, W), h = Math.round((H * w) / W)
    const c = new OffscreenCanvas(w, h)
    const g = c.getContext('2d')
    g.imageSmoothingQuality = 'high'
    g.drawImage(img, 0, 0, w, h)
    const d = g.getImageData(0, 0, w, h).data
    let s = ''
    for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000))
    return { W, H, w, h, rgba: btoa(s) }
  }, { src: dataUrl, AW })
}

/** تمويهٌ صندوقيّ أفقيّ ثم رأسيّ — ثلاثُ مرّاتٍ تقارب الغاوسيّ. */
function blur(a, w, h, r, passes = 3) {
  let src = a
  const tmp = new Float32Array(w * h)
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      let acc = 0
      for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))]
      for (let x = 0; x < w; x++) {
        tmp[y * w + x] = acc / (2 * r + 1)
        acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)]
      }
    }
    const out = new Float32Array(w * h)
    for (let x = 0; x < w; x++) {
      let acc = 0
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / (2 * r + 1)
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
      }
    }
    src = out
  }
  return src
}

const percentile = (arr, p) => {
  const s = Float32Array.from(arr).sort()
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]
}

/** يقرأ الصورةَ مرّةً واحدة: السطوعُ والحدّة. */
export async function read(page, dataUrl) {
  const { W, H, w, h, rgba } = await decode(page, dataUrl)
  const px = Buffer.from(rgba, 'base64')
  const n = w * h
  const L = new Float32Array(n)
  for (let i = 0; i < n; i++) L[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255
  // الحدّة: مربّعُ اللابلاسيّ يُجمع في كتلٍ ويُضغط بالجذر، ويُطرح وسيطُه فلا يُحسب نسيجُ الجدار موضوعًا
  const E = new Float32Array(n)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const lap = 4 * L[i] - L[i - 1] - L[i + 1] - L[i - w] - L[i + w]
      E[i] = lap * lap
    }
  }
  const Eb = blur(E, w, h, Math.max(2, Math.round(w * 0.009)))
  const S = new Float32Array(n)
  for (let i = 0; i < n; i++) S[i] = Math.sqrt(Eb[i])
  const med = percentile(S, 0.5)
  for (let i = 0; i < n; i++) S[i] = Math.max(0, S[i] - med)
  return { W, H, w, h, L, S, lo: percentile(L, 0.005), hi: percentile(L, 0.995) }
}

export const CORNERS = {
  'أسفل-يمين': [1, 1], 'أسفل-يسار': [0, 1], 'أعلى-يمين': [1, 0], 'أعلى-يسار': [0, 0],
}

/** متوسّطُ قيمةٍ في مستطيل (كسورٌ من الصورة). */
function mean(an, A, x, y, rw, rh) {
  const { w, h } = an
  const x0 = Math.floor(x * w), y0 = Math.floor(y * h), x1 = Math.ceil((x + rw) * w), y1 = Math.ceil((y + rh) * h)
  let s = 0, n = 0
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { s += A[yy * w + xx]; n++ }
  return n ? s / n : 0
}

/** القرارُ الأوّل — الزاوية: أقلُّها حدّةً وأبعدُها عن مركز ثقل الموضوع، وميلٌ خفيف إلى الأسفل
 *  (حيث يُتوقَّع الختم). `forced` اسمُ زاويةٍ مكتوب يتقدّم على الحساب. */
export function corner(an, forced) {
  const { w, h, S } = an
  // مركزُ ثقل الموضوع: الحدّةُ مربّعةً فلا تجذبه التفاصيلُ الخافتة
  let sx = 0, sy = 0, sw = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = S[y * w + x] ** 2; sx += v * x; sy += v * y; sw += v }
  const cx = sw ? sx / sw / w : 0.5, cy = sw ? sy / sw / h : 0.5
  const all = mean(an, S, 0, 0, 1, 1) || 1
  const scores = Object.entries(CORNERS).map(([name, [kx, ky]]) => {
    const bw = 0.36, bh = 0.34
    const busy = mean(an, S, kx ? 1 - bw : 0, ky ? 1 - bh : 0, bw, bh) / all
    const dist = Math.hypot(kx - cx, ky - cy) / Math.SQRT2
    const lum = mean(an, an.L, kx ? 1 - bw : 0, ky ? 1 - bh : 0, bw, bh)
    return { name, k: [kx, ky], busy: +busy.toFixed(3), dist: +dist.toFixed(3), lum: +lum.toFixed(3), score: busy - 0.9 * dist - (ky ? 0.08 : 0) }
  }).sort((a, b) => a.score - b.score)
  const pick = forced ? scores.find((s) => s.name === forced) : scores[0]
  if (!pick) throw new Error(`زاويةٌ غيرُ معروفة: «${forced}» — المتاح: ${Object.keys(CORNERS).join('، ')}`)
  return { ...pick, by: forced ? 'مكتوبة' : 'محسوبة', subject: [+cx.toFixed(3), +cy.toFixed(3)], all: scores }
}

/** القرارُ الثاني — قناعُ الموضوع (٠ الفراغ، ٢٥٥ الموضوع)، ناعمُ الحوافّ: تخفت فيه الحلقات. */
export function subjectMask(an) {
  const { w, h, S } = an
  const M = blur(S, w, h, Math.max(3, Math.round(w * 0.045)))
  const lo = percentile(M, 0.55), hi = percentile(M, 0.85)
  const out = Buffer.alloc(w * h)
  for (let i = 0; i < w * h; i++) {
    const t = Math.min(1, Math.max(0, (M[i] - lo) / (hi - lo || 1)))
    out[i] = Math.round(t * t * (3 - 2 * t) * 255)
  }
  return { w, h, data: out.toString('base64') }
}

/** القرارُ الثالث — شدّةُ الغشاء عند الزاوية: بين ‎0.66‎ و‎0.9‎ بقدر سطوعها. */
export function veil(c) {
  return +Math.min(0.9, Math.max(0.66, 0.72 + (c.lum - 0.35) * 0.7)).toFixed(3)
}

/** القرارُ الرابع — مدُّ المستويات حول وسط الصورة نفسِها، بسقف ١٢٪. */
export function levels(an) {
  const span = an.hi - an.lo
  if (span >= 0.93) return { slope: 1, intercept: 0 }
  const slope = Math.min(1.12, 1 / span)
  const mid = (an.lo + an.hi) / 2
  return { slope: +slope.toFixed(4), intercept: +(mid * (1 - slope)).toFixed(4) }
}
