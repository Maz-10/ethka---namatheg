// ═══ الحالة — حفظٌ تلقائيّ بعد كل لمسة، وتراجعٌ متاح دائمًا ═══
// المرحلة الأولى من البناء: الحفظُ في متصفّح العميل وحده (localStorage). وفي المرحلة الثانية يُزامَن مع الخادم
// من هنا نفسِه — `persist()` هي النقطةُ الوحيدة التي تُكتب منها الحالة.

import { TEMPLATES, GUIDE_STAGES, ROLES } from './data.js'

const VERSION = 1
const params = new URLSearchParams(location.search)
export const ORG = (params.get('جهة') || params.get('org') || '').trim()
const KEY = 'ethka-workflow:' + (ORG || 'عام')

let uid = Date.now() % 100000
export const newId = (p) => p + (++uid).toString(36)

const blankGlobal = () => ({
  freq: null, freqNum: '', seasonal: null, seasonWhen: '', team: '',
  entry: [], sender: null, exit: null, exitOther: '', storage: null, secret: null,
})

export function makeStage(name, opts = {}) {
  return {
    id: newId('s'),
    name,
    status: opts.status || 'yes',      // pending · yes · no · sometimes
    condition: '',
    guide: !!opts.guide,                // مرحلةٌ إرشادية فارغة («كيف تبدأ؟»)
    actor: { v: opts.actor || null, src: opts.actor ? 'suggested' : null },
    channels: { v: opts.channels || [], src: opts.channels?.length ? 'suggested' : null },
    work: { v: null },
    wait: { v: null },
    friction: { v: null, reasons: [] },
    docsIn: [],
    docsOut: [],
    constraints: [],
    note: '',
  }
}

export function taskFromTemplate(tplId) {
  const t = TEMPLATES.find((x) => x.id === tplId)
  const stages = t.stages.map((s) => makeStage(s.name, { status: 'pending', actor: s.actor, channels: s.channels }))
  const decisions = t.decisions.map((d) => ({
    id: newId('d'), after: stages[d.after - 1].id, q: d.q,
    back: d.back ? stages[d.back - 1].id : null, out: d.out || '', common: null,
  }))
  return {
    id: newId('t'), title: t.title, templateId: t.id, dept: t.dept, source: 'template',
    entryHint: t.entry, exitHint: t.exit,
    stages, decisions, global: blankGlobal(), story: '', lastQ: '', systems: '', completed: false,
  }
}

export function blankTask(title) {
  return {
    id: newId('t'), title: title || 'مهمة أخرى', templateId: null, dept: null, source: 'blank',
    entryHint: '', exitHint: '',
    stages: GUIDE_STAGES.map((n) => makeStage(n, { guide: true, status: 'yes' })),
    decisions: [], global: blankGlobal(), story: '', lastQ: '', systems: '', completed: false,
  }
}

/** البدء من خريطة سابقة: تُنسخ المراحلُ وخصائصُها بمعرّفاتٍ جديدة. */
export function cloneTask(src, title) {
  const map = new Map()
  const stages = src.stages.filter((s) => s.status !== 'no').map((s) => {
    const n = JSON.parse(JSON.stringify(s)); n.id = newId('s'); map.set(s.id, n.id); return n
  })
  const decisions = src.decisions.filter((d) => map.has(d.after)).map((d) => ({
    ...d, id: newId('d'), after: map.get(d.after), back: d.back ? map.get(d.back) || null : null,
  }))
  return {
    ...blankTask(title), source: 'clone', templateId: src.templateId, dept: src.dept,
    entryHint: src.entryHint, exitHint: src.exitHint, stages, decisions,
  }
}

function fresh() {
  return {
    v: VERSION,
    screen: 'welcome',
    painful: '',       // جوابُ «أي مهمة تُتعبكم أكثر؟»
    dept: 'legal',
    roles: [],         // أدوارُ الجهة التي عرّفها العميل
    tasks: [],
    cur: null,
    seenWaitHint: false,
    returnContact: '',
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fresh()
    const s = JSON.parse(raw)
    if (s.v !== VERSION) return fresh()
    return s
  } catch { return fresh() }
}

export const state = load()
const undoStack = []
const listeners = new Set()
export const onChange = (fn) => listeners.add(fn)

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* امتلأت الذاكرة: تبقى الحالةُ في الصفحة */ }
}

/** كلُّ تغييرٍ يمرّ من هنا: لقطةٌ للتراجع، ثم التغيير، ثم الحفظ، ثم إعادة الرسم. */
export function update(fn, { undoable = true, render = true } = {}) {
  if (undoable) {
    undoStack.push(JSON.stringify(state))
    if (undoStack.length > 80) undoStack.shift()
  }
  fn(state)
  persist()
  if (render) listeners.forEach((l) => l())
}

export const canUndo = () => undoStack.length > 0
export function undo() {
  const prev = undoStack.pop()
  if (!prev) return
  const s = JSON.parse(prev)
  for (const k of Object.keys(state)) delete state[k]
  Object.assign(state, s)
  persist()
  listeners.forEach((l) => l())
}

export function resetAll() {
  undoStack.length = 0
  const s = fresh()
  for (const k of Object.keys(state)) delete state[k]
  Object.assign(state, s)
  persist()
  listeners.forEach((l) => l())
}

export const curTask = () => state.tasks.find((t) => t.id === state.cur) || null

export function roleOf(id) {
  return ROLES.find((r) => r.id === id) || state.roles.find((r) => r.id === id) || null
}
export const allRoles = () => [...ROLES, ...state.roles]
