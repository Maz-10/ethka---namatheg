// ═══ التحقق من ناتج النموذج قبل العرض ═══
// خللُ البنية يُرجع خطأً فيُعاد الطلبُ مرةً واحدة. أما القيمةُ خارج الخيارات المعتمدة، أو بلا شاهدٍ
// من كلام العميل، فتُخفَّض إلى «غير محدد»: النموذجُ يرتّب ما قيل ولا يضيف إليه.

const E = {
  channels: ['paper', 'email', 'chat', 'call', 'sheet', 'system', 'gov', 'other'],
  work: ['lt1', '1to3', 'half', 'day', 'gt1'],
  wait: ['none', 'hours', '1to3', 'week', 'gtweek'],
  friction: ['none', 'sometimes', 'often'],
  reasons: ['approval', 'docs', 'info', 'messages', 'rework', 'load', 'other'],
  constraints: ['handsig', 'stamp', 'presence', 'legal', 'policy', 'nodelegate', 'other'],
  freq: ['lt5', '5to20', '20to50', '50to100', 'gt100'],
  conf: ['stated', 'inferred', 'suggested', 'unknown'],
  redactions: ['person_name', 'case_number', 'party_name', 'email', 'phone'],
}
const isStr = (x) => typeof x === 'string'
const norm = (s) => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[«»"'.,،؛:]/g, ' ').replace(/\s+/g, ' ').trim()

export class ShapeError extends Error {}

/** يُرجع ناتجًا نظيفًا، أو يرمي ShapeError إن اختلّت البنية. */
export function validate(raw, story) {
  let o = raw
  if (isStr(raw)) {
    const m = raw.match(/\{[\s\S]*\}/)
    try { o = JSON.parse(m ? m[0] : raw) } catch { throw new ShapeError('ليس JSON') }
  }
  if (!o || typeof o !== 'object' || !Array.isArray(o.stages)) throw new ShapeError('لا مراحل')
  const src = norm(story)
  const witnessed = (ev) => !!ev && src.includes(norm(ev))

  const prop = (p, list, many = false) => {
    if (!p || typeof p !== 'object') return { value: many ? [] : null, confidence: 'unknown', evidence: null }
    let conf = E.conf.includes(p.confidence) ? p.confidence : 'unknown'
    let value = many ? (Array.isArray(p.value) ? p.value.filter((v) => !list || list.includes(v)) : []) : (p.value ?? null)
    if (!many && list && value != null && !list.includes(value)) value = null
    const evidence = isStr(p.evidence) && p.evidence.trim() ? p.evidence.trim().slice(0, 200) : null
    // المذكورُ والمستنتجُ بلا شاهدٍ من كلام العميل لا يُقبلان
    if ((conf === 'stated' || conf === 'inferred') && !witnessed(evidence)) conf = 'unknown'
    if (conf === 'unknown' || (many ? !value.length : value == null)) return { value: many ? [] : null, confidence: 'unknown', evidence: null }
    return { value, confidence: conf, evidence: conf === 'suggested' ? null : evidence }
  }

  const ids = new Set()
  const stages = o.stages.slice(0, 20).map((s, i) => {
    if (!s || !isStr(s.name) || !s.name.trim()) throw new ShapeError('مرحلة بلا اسم')
    const id = isStr(s.id) && /^s\d+$/.test(s.id) && !ids.has(s.id) ? s.id : `s${i + 1}`
    ids.add(id)
    const actor = s.actor && isStr(s.actor.value) && s.actor.value.length <= 40 ? prop(s.actor, null) : prop(null)
    const fr = prop(s.friction, E.friction)
    return {
      id, name: s.name.trim().slice(0, 60), summary: isStr(s.summary) ? s.summary.slice(0, 240) : '',
      conditional: !!s.conditional, condition: isStr(s.condition) ? s.condition.slice(0, 120) : null,
      actor, channels: prop(s.channels, E.channels, true), work_time: prop(s.work_time, E.work), wait_time: prop(s.wait_time, E.wait),
      friction: { ...fr, reasons: fr.confidence === 'unknown' ? [] : (s.friction?.reasons || []).filter((r) => E.reasons.includes(r)) },
      documents_in: (s.documents_in || []).filter(isStr).slice(0, 8), documents_out: (s.documents_out || []).filter(isStr).slice(0, 8),
      constraints: (s.constraints || []).filter((c) => E.constraints.includes(c)),
    }
  })
  const decisions = (o.decisions || []).filter((d) => d && ids.has(d.after_stage) && isStr(d.question)).map((d) => ({
    after_stage: d.after_stage, question: d.question.slice(0, 120), yes_to: ids.has(d.yes_to) ? d.yes_to : null,
    no_to: ids.has(d.no_to) ? d.no_to : null, evidence: witnessed(d.evidence) ? d.evidence : null,
  }))
  const clarifications = (o.clarifications || []).filter((c) => c && isStr(c.question) && isStr(c.target) && ids.has(c.target.split('.')[0]))
    .slice(0, 3).map((c) => ({ question: c.question.slice(0, 140), options: (c.options || []).filter(isStr).slice(0, 5), target: c.target }))
  const freq = o.monthly_frequency && E.freq.includes(o.monthly_frequency.value) && witnessed(o.monthly_frequency.evidence) ? o.monthly_frequency : { value: null, evidence: null }
  return {
    task_title: isStr(o.task_title) ? o.task_title.slice(0, 80) : '',
    entry_trigger: { text: isStr(o.entry_trigger?.text) ? o.entry_trigger.text.slice(0, 120) : '', channel: E.channels.includes(o.entry_trigger?.channel) ? o.entry_trigger.channel : null, evidence: witnessed(o.entry_trigger?.evidence) ? o.entry_trigger.evidence : null },
    exit_condition: { text: isStr(o.exit_condition?.text) ? o.exit_condition.text.slice(0, 120) : '', evidence: witnessed(o.exit_condition?.evidence) ? o.exit_condition.evidence : null },
    monthly_frequency: freq, stages, decisions, clarifications,
    redactions: (o.redactions || []).filter((r) => E.redactions.includes(r)),
    other_tasks: (o.other_tasks || []).filter(isStr).slice(0, 5),
  }
}
