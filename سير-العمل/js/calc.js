// ═══ الحساب والقواعد — دوالُّ صافية لا تلمس الصفحة، فتُختبر وحدها (`test/calc.test.mjs`) ═══
// كلُّ قيمةٍ هنا من جدول القيم في المواصفات (المحور الثاني، «أولًا: التكرار الشهري»)، واليوم ثماني ساعات عمل.

import { WORK, WAIT, FREQUENCY, ROLES } from './data.js'

export const DAY_HOURS = 8
const byId = (list, id) => list.find((x) => x.id === id)

/** المراحل الداخلة في المسار: ما لم يُطوَ بـ«لا». */
export const activeStages = (task) => task.stages.filter((s) => s.status !== 'no')

/** وزنُ المرحلة: المشروطة بنصف وزنها ما لم يحدد العميل كم مرة تحدث. */
export const weightOf = (s) => (s.status === 'sometimes' ? (s.share != null ? s.share : 0.5) : 1)

/** عددُ مرات المهمة شهريًّا، أو null إن لم يُجَب. */
export function monthlyTimes(g) {
  if (!g || !g.freq || g.freq === 'unknown') return null
  if (g.freq === 'gt100' && Number(g.freqNum) > 100) return Number(g.freqNum)
  if (g.freq === 'custom') return Number(g.freqNum) > 0 ? Number(g.freqNum) : null
  return byId(FREQUENCY, g.freq)?.times ?? null
}

/** المراحلُ التي يتكرر المرورُ بها مرة إضافية عند رجوعٍ شائع — من المرحلة المعاد إليها إلى نقطة القرار. */
export function loopExtra(task) {
  const act = activeStages(task)
  const extra = new Map() // معرّفُ المرحلة ← عددُ المرّات الإضافية
  for (const d of task.decisions || []) {
    if (d.common !== 'common' || !d.back) continue
    const from = act.findIndex((s) => s.id === d.back)
    const to = act.findIndex((s) => s.id === d.after)
    if (from < 0 || to < 0 || from > to) continue
    for (let i = from; i <= to; i++) extra.set(act[i].id, (extra.get(act[i].id) || 0) + 1)
  }
  return extra
}

/** أرقامُ المهمة الثلاثة، وما يلزم لصياغتها. */
export function computeNumbers(task) {
  const act = activeStages(task)
  const extra = loopExtra(task)
  let workHours = 0
  let waitDays = 0
  let unknownWork = 0
  let unknownWait = 0
  for (const s of act) {
    const k = weightOf(s) * (1 + (extra.get(s.id) || 0))
    const w = byId(WORK, s.work?.v)
    const t = byId(WAIT, s.wait?.v)
    if (w) workHours += w.hours * k; else unknownWork++
    if (t) waitDays += t.days * k; else unknownWait++
  }
  const times = monthlyTimes(task.global)
  const workDays = workHours / DAY_HOURS
  const cycleDays = workDays + waitDays
  return {
    stages: act.length,
    workHours,          // للمرة الواحدة
    workDays,
    waitDays,
    cycleDays,          // زمنُ الدورة للمرة الواحدة بأيام العمل
    ratio: cycleDays > 0 ? workDays / cycleDays : null,
    times,
    monthlyHours: times != null ? times * workHours : null,
    unknownWork,
    unknownWait,
  }
}

/** نطاقٌ مقرَّب لا رقم دقيق: من ٧٥ إلى ١٢٥ من كل مئة من القيمة، مقرَّبًا إلى أقرب عشرة.
 *  وما دون العشرين يُقرَّب إلى أقرب واحد، حتى لا يصير النطاقُ «من صفر إلى صفر». */
export function range(value) {
  if (value == null || !(value > 0)) return null
  const step = value < 20 ? 1 : 10
  const r = (x) => Math.max(step === 1 ? 1 : 10, Math.round(x / step) * step)
  let lo = r(value * 0.75)
  let hi = r(value * 1.25)
  if (hi === lo) hi = lo + step
  return [lo, hi]
}

/** «نحو كذا» للأيام: أقرب يوم، أو نصف يوم إن قلّ عن يومين. */
export function approxDays(d) {
  if (d == null) return null
  if (d < 2) return Math.max(0.5, Math.round(d * 2) / 2)
  return Math.round(d)
}

// ── الانتقال بين الأيدي — يُستخرج آليًّا ولا يُسأل عنه
const scopeOf = (actor, customRoles = []) => {
  const r = ROLES.find((x) => x.id === actor)
  if (r) return r.scope
  const c = customRoles.find((x) => x.id === actor)
  return c ? c.scope || 'org' : null
}

export function handoffs(task, customRoles = []) {
  const act = activeStages(task)
  const list = []
  for (let i = 1; i < act.length; i++) {
    const a = act[i - 1].actor?.v
    const b = act[i].actor?.v
    if (!a || !b || a === 'unknown' || b === 'unknown' || a === b) continue
    const sb = scopeOf(b, customRoles)
    const sa = scopeOf(a, customRoles)
    const kind = sb === 'external' || sa === 'external' ? 'external' : sb === 'inside' && sa === 'inside' ? 'inside' : 'org'
    const wait = byId(WAIT, act[i].wait?.v)
    list.push({ from: act[i - 1].id, to: act[i].id, fromActor: a, toActor: b, kind, waitDays: wait ? wait.days : null, slow: !!wait && wait.days >= 1 })
  }
  const actors = new Set(act.map((s) => s.actor?.v).filter((v) => v && v !== 'unknown'))
  const slowest = list.filter((h) => h.waitDays != null).sort((x, y) => y.waitDays - x.waitDays)[0] || null
  return { list, roles: actors.size, slowest: slowest && slowest.waitDays > 0 ? slowest : null }
}
