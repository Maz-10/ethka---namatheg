// ═══ ناتج الترتيب الذكي ← مهمةٌ على الخريطة ═══
// النموذجُ يرتّب ما قاله العميل ولا يضيف إليه: كلُّ قيمةٍ تحمل درجةَ يقينها وشاهدَها من كلامه،
// فيراها العميل مذكورةً، أو مستنتَجةً بنقطة، أو مقترحةً باهتة، أو غيرَ محددة.

import { ROLES, CHANNELS, WORK, WAIT, REASONS, CONSTRAINTS, CUSTOM_COLORS, CUSTOM_SHAPES } from './data.js'
import { makeStage, newId } from './store.js'

const SRC = { stated: 'stated', inferred: 'inferred', suggested: 'suggested' }
const ids = (list) => new Set(list.map((x) => x.id))
const ROLE_IDS = ids(ROLES)

function val(p, allowed) {
  if (!p || p.confidence === 'unknown' || p.value == null) return { v: null, src: null }
  if (allowed && !allowed.has(p.value)) return { v: null, src: null }
  return { v: p.value, src: SRC[p.confidence] || 'suggested', ev: p.evidence || null }
}

/** يحوّل الناتج إلى مراحل وقرارات، ويضيف إلى أدوار الجهة ما سمّاه العميل من أدوارٍ غير معروفة. */
export function stagesFromArranged(out, roles) {
  const newRoles = []
  const roleFor = (label) => {
    const known = [...roles, ...newRoles].find((r) => r.label === label)
    if (known) return known.id
    const k = roles.length + newRoles.length
    const r = { id: newId('r'), label, color: CUSTOM_COLORS[k % CUSTOM_COLORS.length], shape: CUSTOM_SHAPES[k % CUSTOM_SHAPES.length], scope: 'org' }
    newRoles.push(r)
    return r.id
  }
  const map = new Map()
  const stages = out.stages.map((s) => {
    const st = makeStage(s.name, { status: s.conditional ? 'sometimes' : 'yes', summary: s.summary })
    st.condition = s.condition || ''
    map.set(s.id, st.id)
    const a = s.actor || {}
    if (a.value && a.confidence !== 'unknown') {
      const id = ROLE_IDS.has(a.value) ? a.value : roleFor(String(a.value))
      st.actor = { v: id, src: SRC[a.confidence] || 'suggested', ev: a.evidence || null }
    }
    const ch = s.channels || {}
    const chv = (ch.value || []).filter((c) => ids(CHANNELS).has(c))
    st.channels = { v: chv, src: chv.length ? SRC[ch.confidence] || 'suggested' : null, ev: ch.evidence || null }
    st.work = val(s.work_time, ids(WORK))
    st.wait = val(s.wait_time, ids(WAIT))
    const fr = s.friction || {}
    const fv = { none: 'none', sometimes: 'sometimes', often: 'often' }[fr.value] || null
    st.friction = { v: fr.confidence === 'unknown' ? null : fv, reasons: (fr.reasons || []).filter((r) => ids(REASONS).has(r)), src: fv ? SRC[fr.confidence] || 'suggested' : null, ev: fr.evidence || null }
    st.docsIn = s.documents_in || []
    st.docsOut = s.documents_out || []
    st.constraints = (s.constraints || []).filter((c) => ids(CONSTRAINTS).has(c))
    return st
  })
  const decisions = (out.decisions || []).filter((d) => map.has(d.after_stage)).map((d) => ({
    id: newId('d'), after: map.get(d.after_stage), q: d.question, back: d.no_to ? map.get(d.no_to) || null : null, out: '', common: null, ev: d.evidence || null,
  }))
  const clarifications = (out.clarifications || []).slice(0, 3).map((c) => {
    const [sid, field] = String(c.target || '').split('.')
    return map.has(sid) ? { id: newId('q'), question: c.question, options: c.options || [], target: `${map.get(sid)}.${field}`, done: false } : null
  }).filter(Boolean)
  return { stages, decisions, clarifications, newRoles }
}

/** جوابُ سؤال التوضيح: يُطابَق الخيارُ بالخيارات المعتمدة لتلك الخاصية إن أمكن، وإلا يُضاف ملاحظةً على المرحلة. */
export function applyClarification(task, q, option, roles) {
  const [sid, field] = q.target.split('.')
  const s = task.stages.find((x) => x.id === sid)
  if (!s) return
  const lists = { actor: [...ROLES, ...roles], work_time: WORK, wait_time: WAIT }
  const key = { actor: 'actor', work_time: 'work', wait_time: 'wait' }[field]
  const hit = option && lists[field]?.find((o) => o.label === option || option.includes(o.label))
  if (key && hit) s[key] = { v: hit.id, src: 'user' }
  else if (option) s.note = [s.note, `${q.question} ${option}`].filter(Boolean).join('\n')
}
