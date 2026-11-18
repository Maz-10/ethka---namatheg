// ═══ الحالة — حفظٌ تلقائيّ بعد كل لمسة، وتراجعٌ متاح دائمًا ═══
// تُحفظ أولًا في متصفّح العميل، ثم تُزامَن مع الخادم إن فُتحت الصفحة من رابطٍ خاص (`sync.js`).
// `persist()` هي النقطةُ الوحيدة التي تُكتب منها الحالة.

import { TEMPLATES, GUIDE_STAGES, ROLES } from './data.js'
import { TOKEN, pushState } from './sync.js'

const VERSION = 2
const params = new URLSearchParams(location.search)
export let ORG = (params.get('جهة') || params.get('org') || '').trim()
export const setOrg = (name) => { ORG = name || ORG }
const KEY = 'ethka-workflow:' + (TOKEN || ORG || 'عام')

let uid = Date.now() % 100000
export const newId = (p) => p + (++uid).toString(36) + Math.random().toString(36).slice(2, 5)

// قوالبُ أضافها الفريق من خرائط سابقة (تصل من الخادم)
export const extraTemplates = []
export const allTemplates = () => [...TEMPLATES, ...extraTemplates]

const blankGlobal = () => ({
  freq: null, freqNum: '', seasonal: null, seasonWhen: '', team: '',
  entry: [], sender: null, exit: null, exitOther: '', storage: null, secret: null,
})

const prop = (v, src) => ({ v, src: v == null || (Array.isArray(v) && !v.length) ? null : src })

export function makeStage(name, opts = {}) {
  return {
    id: newId('s'),
    name,
    status: opts.status || 'yes',      // pending · yes · no · sometimes
    condition: '',
    guide: !!opts.guide,                // مرحلةٌ إرشادية فارغة («كيف تبدأ؟»)
    summary: opts.summary || '',
    actor: prop(opts.actor || null, 'suggested'),
    channels: prop(opts.channels || [], 'suggested'),
    work: { v: null },
    wait: { v: null },
    friction: { v: null, reasons: [] },
    docsIn: [],
    docsOut: [],
    constraints: [],
    note: '',
  }
}

const baseTask = () => ({
  id: newId('t'), title: '', templateId: null, dept: null, source: 'blank', entryHint: '', exitHint: '',
  stages: [], decisions: [], clarifications: [], global: blankGlobal(), story: '', keepStory: false,
  arranged: null, lastQ: '', systems: '', completed: false, final: null, updatedAt: Date.now(),
})

export function taskFromTemplate(tplId) {
  const t = allTemplates().find((x) => x.id === tplId)
  const stages = t.stages.map((s) => makeStage(s.name, { status: 'pending', actor: s.actor, channels: s.channels }))
  const decisions = t.decisions.map((d) => ({
    id: newId('d'), after: stages[d.after - 1].id, q: d.q,
    back: d.back ? stages[d.back - 1].id : null, out: d.out || '', common: null,
  }))
  return { ...baseTask(), title: t.title, templateId: t.id, dept: t.dept, source: 'template', entryHint: t.entry, exitHint: t.exit, stages, decisions }
}

export function blankTask(title) {
  return { ...baseTask(), title: title || 'مهمة أخرى', stages: GUIDE_STAGES.map((n) => makeStage(n, { guide: true })) }
}

/** البدء من خريطة سابقة: تُنسخ المراحلُ وخصائصُها بمعرّفاتٍ جديدة. */
export function cloneTask(src, title) {
  const map = new Map()
  const stages = src.stages.filter((s) => s.status !== 'no').map((s) => {
    const c = JSON.parse(JSON.stringify(s)); c.id = newId('s'); map.set(s.id, c.id); return c
  })
  const decisions = src.decisions.filter((d) => map.has(d.after)).map((d) => ({
    ...d, id: newId('d'), after: map.get(d.after), back: d.back ? map.get(d.back) || null : null,
  }))
  return { ...baseTask(), title, source: 'clone', templateId: src.templateId, dept: src.dept, entryHint: src.entryHint, exitHint: src.exitHint, stages, decisions }
}

function fresh() {
  return {
    v: VERSION, screen: 'welcome', dept: 'legal', roles: [], tasks: [], cur: null,
    seenWaitHint: false, booking: null, updatedAt: 0,
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fresh()
    const s = JSON.parse(raw)
    return s.v === VERSION ? s : fresh()
  } catch { return fresh() }
}

export const state = load()
const undoStack = []
const listeners = new Set()
export const onChange = (fn) => listeners.add(fn)
let syncListener = null
export const onSynced = (fn) => { syncListener = fn }

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* امتلأت الذاكرة: تبقى الحالةُ في الصفحة */ }
  pushState(state, syncListener)
}

/** كلُّ تغييرٍ يمرّ من هنا: لقطةٌ للتراجع، ثم التغيير، ثم الحفظ، ثم إعادة الرسم. */
export function update(fn, { undoable = true, render = true } = {}) {
  if (undoable) {
    undoStack.push(JSON.stringify(state))
    if (undoStack.length > 80) undoStack.shift()
  }
  fn(state)
  const now = Date.now()
  state.updatedAt = now
  const t = curTask(); if (t) t.updatedAt = now
  persist()
  if (render) listeners.forEach((l) => l())
}

function replace(s) {
  for (const k of Object.keys(state)) delete state[k]
  Object.assign(state, s)
}

export const canUndo = () => undoStack.length > 0
export function undo() {
  const prev = undoStack.pop()
  if (!prev) return
  replace(JSON.parse(prev))
  state.updatedAt = Date.now()
  persist()
  listeners.forEach((l) => l())
}

export function resetAll() {
  undoStack.length = 0
  replace(fresh())
  persist()
  listeners.forEach((l) => l())
}

/** دمجُ حالة الخادم: لكل مهمةٍ أحدثُ نسختيها، وما سوى المهام من الأحدث. لا يُفقد شيءٌ رسمه أحدُ الطرفين. */
export function hydrate(remote) {
  if (!remote || remote.v !== VERSION) return false
  const local = state
  const tasks = new Map(local.tasks.map((t) => [t.id, t]))
  let changed = false
  for (const t of remote.tasks || []) {
    const mine = tasks.get(t.id)
    if (!mine || (t.updatedAt || 0) > (mine.updatedAt || 0)) {
      // نصُّ الحكاية لا يعود من الخادم إن لم يأذن العميل بحفظه؛ فلا يُمحى ما في المتصفح
      if (mine && !t.story && mine.story) t.story = mine.story
      tasks.set(t.id, t); changed = true
    }
  }
  const roles = new Map([...(remote.roles || []), ...local.roles].map((r) => [r.id, r]))
  const newer = (remote.updatedAt || 0) > (local.updatedAt || 0) ? remote : local
  replace({ ...newer, tasks: [...tasks.values()], roles: [...roles.values()], cur: local.cur || [...tasks.values()].filter((t) => !t.completed).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0]?.id || null, screen: (local.updatedAt ? local.screen : newer.screen) || 'welcome' })
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
  return changed
}

export const curTask = () => state.tasks.find((t) => t.id === state.cur) || null

export function roleOf(id) {
  return ROLES.find((r) => r.id === id) || state.roles.find((r) => r.id === id) || null
}
export const allRoles = () => [...ROLES, ...state.roles]
