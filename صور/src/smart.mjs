// ═══ «الذكاء» — قراءةُ الصورة قبل تركيبها في اللوح ═══
// لا يُلصق الإطارُ على الصورة كما هو؛ تُقرأ الصورةُ أوّلًا فيُقرَّر لها:
//   ١) المستويات — مدٌّ خفيف حول وسط الصورة نفسِها بسقف ١٢٪، فلا يُفتَّح الداكنُ ولا يُغمَّق الفاتح.
//   ٢) شدّةُ الغشاء — الغشاءُ تذهيبٌ خفيف (الظلالُ إلى ليل الهويّة، والأضواءُ إلى كريميّها). وتشتدّ قليلًا
//      على الصورة ذات المسحة اللونيّة (إضاءةٌ صفراء أو زرقاء)، فتتقارب صورُ اللقاء كلُّها في نَفَسٍ واحد.
//   ٣) الدقّة — لا تُعرض الصورةُ في اللوح بأكبرَ من بكسلاتها (frame.mjs يقرأ `W`).
// والقراءةُ بمحرّك Chromium نفسِه الذي يرسم (فلا مكتبةَ صورٍ ثانية): تُفكّ الصورةُ في لوحٍ مصغَّر.

const AW = 480 // عرضُ لوح التحليل (بكسل): يكفي للإحصاء، ويبقى الحسابُ لحظيًّا

/** يفكّ الصورةَ في المتصفّح (مع اتّجاه EXIF) ويعيد بكسلاتها مصغّرة (RGBA). */
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

const percentile = (arr, p) => {
  const s = Float32Array.from(arr).sort()
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]
}

/** يقرأ الصورةَ مرّةً واحدة: أبعادُها، ومئينا سطوعها، ومتوسّطُ لونها. */
export async function read(page, dataUrl) {
  const { W, H, w, h, rgba } = await decode(page, dataUrl)
  const px = Buffer.from(rgba, 'base64')
  const n = w * h
  const L = new Float32Array(n)
  let r = 0, g = 0, b = 0
  for (let i = 0; i < n; i++) {
    const R = px[i * 4] / 255, G = px[i * 4 + 1] / 255, B = px[i * 4 + 2] / 255
    L[i] = 0.2126 * R + 0.7152 * G + 0.0722 * B
    r += R; g += G; b += B
  }
  return { W, H, lo: percentile(L, 0.005), hi: percentile(L, 0.995), mean: [r / n, g / n, b / n] }
}

/** القرارُ الأوّل — مدُّ المستويات حول وسط الصورة نفسِها، بسقف ١٢٪، ولا يُمسّ ما هو ممتدٌّ أصلًا. */
export function levels(an) {
  const span = an.hi - an.lo
  if (span >= 0.93) return { slope: 1, intercept: 0 }
  const slope = Math.min(1.12, 1 / span)
  const mid = (an.lo + an.hi) / 2
  return { slope: +slope.toFixed(4), intercept: +(mid * (1 - slope)).toFixed(4) }
}

/** القرارُ الثاني — شدّةُ الغشاء: ‎0.16‎ أساسًا، وتزيد بقدر مسحة الصورة اللونيّة حتى ‎0.26‎.
 *  المسحةُ بُعدُ متوسّط اللون عن الرماديّ المحايد. */
export function veil(an) {
  const [r, g, b] = an.mean
  const gray = (r + g + b) / 3
  const cast = Math.hypot(r - gray, g - gray, b - gray)
  return { strength: +Math.min(0.26, 0.16 + cast * 1.4).toFixed(3), cast: +cast.toFixed(3) }
}
