// ═══ الغبار الذهبي في الترحيب — مأخوذٌ من صدر موقع إذكاء التعريفي (`site/src/motion/dust.ts`) ═══
// جسيماتٌ تنعقد معيّنَ الشعار وتتنفّس، وتنتفش إذا مرّ بها المؤشّر ثم تعود. وهنا تزيد حركةً واحدة تخصّ الصفحة:
// إذا أُشير إلى خطوةٍ من خطوات الرسم أعاد الغبارُ تشكيل نفسه على هيئتها — قائمةُ المهام، ثم مسارُ المراحل،
// ثم سجلُّ الأرقام — فيرى العميلُ ما سيصنعه قبل أن يبدأ.
// المحاكاةُ نابضٌ نحو هدفٍ يتبدّل مع تخميد، ولكلّ جسيمٍ صلابتُه فلا تصل كلُّها معًا. والرسمُ Canvas2D.
// ويتوقف الرسمُ إذا خرجت اللوحة من الشاشة أو اختفت الصفحة، ويُرسم الشكلُ ساكنًا لمن طلب تقليل الحركة.

const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)

/** نقطةٌ على محيط معيّن نصفُ قطره r، بزاوية t (٠..١). */
function onDiamond(cx, cy, r, t) {
  const k = (((t % 1) + 1) % 1) * 4, i = Math.min(3, Math.floor(k)), f = k - i
  const P = [[0, -r], [r, 0], [0, r], [-r, 0], [0, -r]]
  return [cx + P[i][0] + (P[i + 1][0] - P[i][0]) * f, cy + P[i][1] + (P[i + 1][1] - P[i][1]) * f]
}
/** نقطةٌ داخل معيّن — موزّعةٌ أكثف نحو المركز كما في الموقع. */
function inDiamond(cx, cy, r) {
  // مربعٌ مدار ٤٥° يملأ المعيّن بالتساوي، ثم ميلٌ خفيف نحو المركز
  const a = rnd(-1, 1), b = rnd(-1, 1), s = Math.pow(Math.random(), 0.6)
  return [cx + ((a + b) / 2) * r * s, cy + ((a - b) / 2) * r * s]
}

/** الأشكال: لكل جسيمٍ هدفُه في كل شكل، والمقاسُ نسبةٌ من اللوحة. */
const SHAPES = {
  // معيّنُ الشعار: حافّةٌ كثيفة، وداخلٌ متناثر
  diamond(i, n, w, h) {
    const r = Math.min(w, h) * 0.36
    return i < n * 0.62 ? onDiamond(w / 2, h / 2, r, i / (n * 0.62) + rnd(-0.002, 0.002)) : inDiamond(w / 2, h / 2, r * 0.96)
  },
  // تختار المهمة: قائمةُ مهامّ — أسطرٌ متوازية يتقدّمها معيّنٌ صغير، وأحدُها مُبرَز
  list(i, n, w, h) {
    const rows = 5, s = Math.min(w, h)
    const row = i % rows, gap = s * 0.15, y = h / 2 + (row - (rows - 1) / 2) * gap
    const right = w / 2 + s * 0.42, len = s * (row === 1 ? 0.7 : 0.52 + ((row * 37) % 5) * 0.03)
    const k = Math.floor(i / rows), m = Math.floor(n / rows)
    if (k < m * 0.22) return onDiamond(right, y, s * 0.028, k / (m * 0.22)) // علامةُ السطر
    const t = (k - m * 0.22) / (m * 0.78)
    return [right - s * 0.08 - t * len, y + rnd(-1.4, 1.4) * (row === 1 ? 1.8 : 1)]
  },
  // تصحح مراحلها: مسارٌ من خمس مراحل من اليمين إلى اليسار، بينها خيطٌ منقوط
  path(i, n, w, h) {
    const stages = 5, s = Math.min(w, h), span = Math.min(w * 0.86, s * 1.9)
    const step = span / (stages - 1), r = Math.min(s * 0.085, step * 0.3)
    if (i < n * 0.8) {
      const st = i % stages, cx = w / 2 + span / 2 - st * step
      const k = Math.floor(i / stages), m = Math.floor(n * 0.8 / stages)
      return k < m * 0.7 ? onDiamond(cx, h / 2, r, k / (m * 0.7)) : inDiamond(cx, h / 2, r * 0.9)
    }
    const t = (i - n * 0.8) / (n * 0.2)
    const x = w / 2 + span / 2 - t * span
    return [Math.round(x / 7) * 7, h / 2 + rnd(-0.8, 0.8)]
  },
  // ترى خريطتها وأرقامها: سجلٌّ من ثلاثة أشرطة تحت خطٍّ واحد
  ledger(i, n, w, h) {
    const s = Math.min(w, h), right = w / 2 + s * 0.48, top = h / 2 - s * 0.28
    if (i < n * 0.12) return [right - (i / (n * 0.12)) * s * 0.96, top] // خطُّ الأساس
    const bars = [0.92, 0.6, 0.38], j = i % 3, y = top + s * 0.15 + j * s * 0.17
    const bx = Math.random(); return [right - bx * s * bars[j], y + rnd(-s * 0.014, s * 0.014) * (bx < 0.04 ? 2.6 : 1)]
  },
}

export function mountDust(canvas, { shape = 'diamond' } = {}) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return { set() {}, destroy() {} }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const color = getComputedStyle(canvas).color || '#B9933A'
  let w = 0, h = 0, dpr = 1, n = 0
  let px, py, vx, vy, tx, ty, k, a, sz
  let current = shape
  let raf = 0, running = false, visible = true, t0 = performance.now()
  const pointer = { x: -9999, y: -9999 }

  function retarget(name) {
    current = name
    const f = SHAPES[name]
    for (let i = 0; i < n; i++) { const p = f(i, n, w, h); tx[i] = p[0]; ty[i] = p[1] }
  }

  function resize() {
    const r = canvas.getBoundingClientRect()
    w = r.width; h = r.height; dpr = Math.min(2, devicePixelRatio || 1)
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
    const want = Math.round(Math.min(1500, Math.max(500, (w * h) / 110)))
    if (want !== n) {
      const first = n === 0
      n = want
      px = new Float32Array(n); py = new Float32Array(n); vx = new Float32Array(n); vy = new Float32Array(n)
      tx = new Float32Array(n); ty = new Float32Array(n); k = new Float32Array(n); a = new Float32Array(n); sz = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        // الافتتاح: الغبارُ متناثرٌ في اللوحة ثم ينعقد
        px[i] = first && !reduced ? rnd(0, w) : 0; py[i] = first && !reduced ? rnd(0, h) : 0
        k[i] = rnd(0.018, 0.055); a[i] = rnd(0.3, 0.95); sz[i] = rnd(0.8, 2.1)
      }
    }
    retarget(current)
    if (reduced) { for (let i = 0; i < n; i++) { px[i] = tx[i]; py[i] = ty[i] } draw(0) }
  }

  function draw(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = color
    const breathe = reduced ? 1 : 1 + Math.sin(time / 1400) * 0.012
    const cx = w / 2, cy = h / 2
    for (let i = 0; i < n; i++) {
      if (!reduced) {
        const gx = cx + (tx[i] - cx) * breathe, gy = cy + (ty[i] - cy) * breathe
        vx[i] = (vx[i] + (gx - px[i]) * k[i]) * 0.86
        vy[i] = (vy[i] + (gy - py[i]) * k[i]) * 0.86
        const dx = px[i] - pointer.x, dy = py[i] - pointer.y, d2 = dx * dx + dy * dy
        if (d2 < 4900) { const f = (1 - d2 / 4900) * 2.6 / (Math.sqrt(d2) + 1); vx[i] += dx * f; vy[i] += dy * f } // ينتفش حول المؤشّر
        px[i] += vx[i]; py[i] += vy[i]
      }
      ctx.globalAlpha = a[i]
      ctx.fillRect(px[i] - sz[i] / 2, py[i] - sz[i] / 2, sz[i], sz[i])
    }
    ctx.globalAlpha = 1
  }

  function loop(now) {
    if (!running) return
    draw(now - t0)
    raf = requestAnimationFrame(loop)
  }
  function start() { if (!running && !reduced && visible && !document.hidden) { running = true; raf = requestAnimationFrame(loop) } }
  function stop() { running = false; cancelAnimationFrame(raf) }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop() })
  io.observe(canvas)
  const ro = new ResizeObserver(() => resize())
  ro.observe(canvas)
  const onVis = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVis)
  const host = canvas.parentElement
  const move = (e) => { const r = canvas.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top }
  const leave = () => { pointer.x = pointer.y = -9999 }
  host.addEventListener('pointermove', move)
  host.addEventListener('pointerleave', leave)

  resize()
  start()

  return {
    set(name) {
      if (!SHAPES[name] || name === current) return
      retarget(name)
      if (reduced) { for (let i = 0; i < n; i++) { px[i] = tx[i]; py[i] = ty[i] } draw(0) }
      else for (let i = 0; i < n; i++) { vx[i] += rnd(-1.5, 1.5); vy[i] += rnd(-1.5, 1.5) } // دفعةٌ خفيفة تُظهر التحوّل
    },
    destroy() {
      stop(); io.disconnect(); ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave)
    },
  }
}
