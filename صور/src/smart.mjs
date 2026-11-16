// ═══ «الذكاء» — قراءةُ الصورة قبل تأطيرها ═══
// النموذجُ لا يضع إطارًا ثابتًا على أيّ صورة، بل يقرؤها أوّلًا ثم يقرّر ثلاثةَ قرارات:
//   ١) أين الموضوع؟  — خريطةُ الحدّة: ما كان في بؤرة العدسة حادٌّ (المتحدّث والشاشة)، وما خارجها ضبابيّ
//      (رؤوسُ الصفّ الأوّل). فيُقتطَع لكل مقاسٍ النطاقُ الذي يحمل أكثرَ الحدّة **في الجزء الظاهر منه**.
//   ٢) كم يُصحَّح الضوء؟ — مدُّ المستويات بين المئين الأدنى والأعلى، بسقفٍ صغير: تتوحّد السلسلةُ
//      المصوَّرة بأكثر من آلة، ولا تُصبَغ الصورةُ بلونٍ ليس فيها.
//   ٣) كم يُعتَّم ما تحت الكتابة؟ — يُقاس سطوعُ الشريط الذي يلي الموجة وزحامُه، فيشتدّ التعتيمُ
//      على الفاتح ويخفّ على الداكن.
// والقراءةُ بمحرّك Chromium نفسِه الذي يرسم (فلا مكتبةَ صورٍ ثانية): تُفكّ الصورةُ في لوحٍ مصغَّر،
// وتُحسب الخرائطُ هنا.

const AW = 640 // عرضُ لوح التحليل (بكسل): يكفي لتمييز الحادّ من الضبابيّ، ويبقى الحسابُ لحظيًّا

/** يفكّ الصورةَ في المتصفّح ويعيد بكسلاتها مصغّرة (RGBA). */
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
  let src = a, tmp = new Float32Array(w * h)
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

/** صورةٌ تكامليّة: مجموعُ أيّ مستطيلٍ بأربع قراءات. */
function integral(a, w, h) {
  const I = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      row += a[y * w + x]
      I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row
    }
  }
  return I
}

function rectSum(I, w, x, y, rw, rh) {
  const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y))
  const x1 = Math.max(x0, Math.round(x + rw)), y1 = Math.max(y0, Math.round(y + rh))
  const W1 = w + 1
  return I[y1 * W1 + x1] - I[y0 * W1 + x1] - I[y1 * W1 + x0] + I[y0 * W1 + x0]
}

const percentile = (arr, p) => {
  const s = Float32Array.from(arr).sort()
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]
}

/** يقرأ الصورةَ مرّةً واحدة ويعيد كلَّ ما تحتاجه القرارات. */
export async function read(page, dataUrl) {
  const { W, H, w, h, rgba } = await decode(page, dataUrl)
  const px = Buffer.from(rgba, 'base64')
  const L = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) L[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255

  // الحدّة: مربّعُ اللابلاسيّ (التفاصيلُ الدقيقة) — يعلو في البؤرة ويخبو في الضبابيّ
  const E = new Float32Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const lap = 4 * L[i] - L[i - 1] - L[i + 1] - L[i - w] - L[i + w]
      E[i] = lap * lap
    }
  }
  // تُجمع الحدّةُ في كُتلٍ بقدر ٢٫٥٪ من العرض، وتُضغط بالجذر فلا تستأثر حافّةٌ واحدة، ثم يُطرح وسيطُها
  // فلا يُحسب نسيجُ الجدار الخافت موضوعًا
  const Eb = blur(E, w, h, Math.max(2, Math.round(w * 0.009)))
  const S = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) S[i] = Math.sqrt(Eb[i])
  const med = percentile(S, 0.5)
  for (let i = 0; i < w * h; i++) S[i] = Math.max(0, S[i] - med)

  // المستويات: المئين ٠٫٥ و٩٩٫٥ للسطوع
  const lo = percentile(L, 0.005), hi = percentile(L, 0.995)

  return { W, H, w, h, L, S, IS: integral(S, w, h), IL: integral(L, w, h), lo, hi }
}

/** القرارُ الأوّل — الاقتطاع. `aspect` نسبةُ خانة الصورة في المقاس (عرض/ارتفاع)، و`vis` الجزءُ الظاهر منها
 *  (كسورٌ من الخانة: ما فوق الموجة). `focus` [س، ص] من ٠ إلى ١ يتقدّم على الحساب إن كُتب، و`zoom` ≥ ١ تكبيرٌ اختياريّ.
 *  يعيد نافذةَ الاقتطاع كسورًا من الصورة الأصليّة. */
export function crop(an, { aspect, vis }, { focus, zoom, maxZoom = 1 } = {}) {
  const { w, h, IS } = an
  let cw1, ch1
  if (w / h > aspect) { ch1 = h; cw1 = h * aspect } else { cw1 = w; ch1 = w / aspect }
  const total = rectSum(IS, w, 0, 0, w, h) || 1

  // أفضلُ موضعٍ لنافذةٍ بتكبيرٍ معطى: أكثرُ الحدّة في الجزء الظاهر، وميلٌ خفيف إلى الوسط يحسم التعادل
  const search = (z) => {
    const cw = cw1 / z, ch = ch1 / z
    let best = null
    for (let y = 0; y <= h - ch + 0.001; y += 1) {
      for (let x = 0; x <= w - cw + 0.001; x += 1) {
        const sharp = rectSum(IS, w, x + vis.x * cw, y + vis.y * ch, vis.w * cw, vis.h * ch) / total
        const dx = (x + cw / 2) / w - 0.5, dy = (y + ch / 2) / h - 0.5
        const score = sharp - 0.04 * (dx * dx + dy * dy)
        if (!best || score > best.score) best = { x, y, score, sharp }
      }
    }
    return { x: best.x / w, y: best.y / h, w: cw / w, h: ch / h, kept: best.sharp, zoom: z }
  }

  if (focus) {
    const z = zoom || 1, cw = cw1 / z, ch = ch1 / z
    // البؤرةُ المكتوبة تقع في وسط الجزء الظاهر لا في وسط الخانة
    const x = Math.min(w - cw, Math.max(0, focus[0] * w - (vis.x + vis.w / 2) * cw))
    const y = Math.min(h - ch, Math.max(0, focus[1] * h - (vis.y + vis.h / 2) * ch))
    return { x: x / w, y: y / h, w: cw / w, h: ch / h, zoom: z, by: 'البؤرة المكتوبة' }
  }
  if (zoom) return { ...search(zoom), by: 'خريطة الحدّة · تكبيرٌ مكتوب' }

  // التقريبُ الذكيّ: يقترب خطوةً خطوة ما دام لا يفقد من الموضوع الحادّ أكثرَ من ٣٪ — فيسقط الضبابيُّ
  // والفراغ، ويبقى المتحدّثُ والشاشةُ كاملين. وسقفُه دقّةُ الأصل (`maxZoom`) فلا تُكبَّر الصورةُ فوق بكسلاتها.
  const base = search(1)
  let pick = base
  for (let z = 1.04; z <= maxZoom + 1e-6; z += 0.04) {
    const c = search(z)
    if (c.kept >= 0.97 * base.kept) pick = c
    else break
  }
  return { ...pick, by: pick.zoom > 1 ? 'خريطة الحدّة · تقريب' : 'خريطة الحدّة' }
}

/** متوسّطُ السطوع والزحام في منطقةٍ من الخانة (كسورٌ منها) بعد الاقتطاع. */
export function region(an, c, r) {
  const { w, h, IL, IS } = an
  const x = (c.x + r.x * c.w) * w, y = (c.y + r.y * c.h) * h
  const rw = r.w * c.w * w, rh = r.h * c.h * h
  const n = Math.max(1, Math.round(rw) * Math.round(rh))
  const all = rectSum(IS, w, 0, 0, w, h) / (w * h) || 1
  return { lum: rectSum(IL, w, x, y, rw, rh) / n, busy: rectSum(IS, w, x, y, rw, rh) / n / all }
}

/** القرارُ الثاني — مدُّ المستويات بسقف: لا يُمدّ أكثر من ١٢٪، ولا يُمسّ ما هو ممتدٌّ أصلًا. */
export function levels(an) {
  const span = an.hi - an.lo
  if (span >= 0.93) return { slope: 1, intercept: 0 }
  const slope = Math.min(1.12, 1 / span)
  // يُمدّ حول وسط الصورة نفسِها لا حول الرماديّ المتوسّط: يزيد التباينُ ويبقى ليلُ الصورة الداكنة ليلًا
  const mid = (an.lo + an.hi) / 2
  return { slope: +slope.toFixed(4), intercept: +(mid * (1 - slope)).toFixed(4) }
}

/** القرارُ الثالث — شدّةُ التعتيم فوق الموجة: يشتدّ مع السطوع والزحام، بين حدّين. */
export function scrim({ lum, busy }) {
  const a = 0.18 + Math.max(0, lum - 0.3) * 0.75 + Math.max(0, busy - 1) * 0.06
  return +Math.min(0.62, Math.max(0.18, a)).toFixed(3)
}
