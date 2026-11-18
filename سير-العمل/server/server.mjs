// ═══ خادم صفحة رسم سير العمل — بلا اعتماديات، على Node وحده ═══
// يقدّم الصفحة ولوحة الفريق، ويحفظ ما يرسمه العميل في ملفات JSON داخل DATA_DIR.
//
//   PORT=8787 TEAM_KEY=… node سير-العمل/server/server.mjs
//
// الروابط: ‎/r/<مفتاح>‎ صفحة العميل · ‎/team/‎ لوحة الفريق (بمفتاح TEAM_KEY).
// لا تسجيلَ دخول على العميل: الرابطُ نفسُه هو الإذن، ولا يرى صاحبُ رابطٍ بيانات جهةٍ أخرى بحال.

import { createServer } from 'node:http'
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { join, normalize, extname, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { redactTask } from './redact.mjs'
import * as AI from './arrange/index.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = normalize(join(HERE, '..'))
const DATA = process.env.DATA_DIR || join(ROOT, 'data')
const PORT = Number(process.env.PORT || 8787)
const TEAM_KEY = process.env.TEAM_KEY || randomBytes(12).toString('base64url')
if (!process.env.TEAM_KEY) console.log(`مفتاح لوحة الفريق لهذه الجلسة: ${TEAM_KEY}`)

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.png': 'image/png' }
const PUBLIC = ['index.html', 'team.html', 'css', 'js', 'fonts']

// ════════════ التخزين ════════════
await mkdir(join(DATA, 'states'), { recursive: true })
const linksFile = join(DATA, 'links.json')
const tplFile = join(DATA, 'templates.json')
const readJSON = (f, d) => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return d } }
const links = readJSON(linksFile, {})
const templates = readJSON(tplFile, [])
const states = new Map()

const writes = new Map()
/** كتابةٌ ذرّية بعد هدوءٍ قصير: ملفٌّ مؤقت ثم إعادةُ تسمية، فلا يُترك ملفٌّ نصفُه مكتوب. */
function save(file, data) {
  clearTimeout(writes.get(file))
  writes.set(file, setTimeout(async () => {
    writes.delete(file)
    const tmp = file + '.' + process.pid + '.tmp'
    await writeFile(tmp, JSON.stringify(data, null, 1))
    await rename(tmp, file)
  }, 150))
}
const saveLinks = () => save(linksFile, links)
const stateFile = (root) => join(DATA, 'states', root + '.json')
function stateOf(root) {
  if (!states.has(root)) states.set(root, readJSON(stateFile(root), null))
  return states.get(root)
}
function setState(root, s) { states.set(root, s); save(stateFile(root), s) }

const newToken = () => randomBytes(16).toString('base64url')
const rootOf = (link) => (link.parent ? links[link.parent] : link)

// ════════════ أدوات ════════════
function send(res, code, body, headers = {}) {
  const json = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers })
  res.end(json)
}
async function body(req, limit = 1_000_000, raw = false) {
  const chunks = []; let size = 0
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error('large'), { code: 413 }); chunks.push(c) }
  const buf = Buffer.concat(chunks)
  if (raw) return buf
  try { return JSON.parse(buf.toString('utf8') || '{}') } catch { throw Object.assign(new Error('json'), { code: 400 }) }
}

// حدٌّ لعدد الطلبات لكل رابط: نافذةُ ساعة
const hits = new Map()
function limited(token, kind, max) {
  const k = token + ':' + kind
  const now = Date.now()
  const h = (hits.get(k) || []).filter((t) => now - t < 3600_000)
  h.push(now); hits.set(k, h)
  return h.length > max
}

function teamOK(req) {
  const k = Buffer.from(String(req.headers['x-team-key'] || ''))
  const t = Buffer.from(TEAM_KEY)
  return k.length === t.length && timingSafeEqual(k, t)
}

// ════════════ الحالة: دمجٌ لا يُضيع شيئًا ════════════
const done = (s) => s.actor?.v && s.work?.v && s.wait?.v && s.friction?.v

function merge(stored, incoming) {
  if (!stored) return incoming
  const tasks = new Map((stored.tasks || []).map((t) => [t.id, t]))
  for (const t of incoming.tasks || []) {
    const mine = tasks.get(t.id)
    if (!mine || (t.updatedAt || 0) >= (mine.updatedAt || 0)) tasks.set(t.id, t)
  }
  const roles = new Map([...(stored.roles || []), ...(incoming.roles || [])].map((r) => [r.id, r]))
  const newer = (incoming.updatedAt || 0) >= (stored.updatedAt || 0) ? incoming : stored
  return { ...newer, tasks: [...tasks.values()], roles: [...roles.values()] }
}

/** ما يُحفظ على الخادم: بلا حساس، وبلا كلامٍ أصلي لم يأذن العميل بحفظه. */
function sanitize(state) {
  const s = JSON.parse(JSON.stringify(state))
  s.screen = undefined; s.cur = undefined
  for (const t of s.tasks || []) {
    if (!t.keepStory) t.story = '' // الكلامُ الأصلي يبقى في متصفّح العميل، ولا يُحفظ هنا إلا بإذنه
    redactTask(t)
  }
  return s
}

function linkStatus(l) {
  const ev = l.events || []
  const st = stateOf(l.token)
  const tasks = st?.tasks || []
  if (tasks.some((t) => t.completed)) return 'completed'
  if (tasks.length || ev.some((e) => e.name === 'start')) return 'started'
  if (ev.some((e) => e.name === 'opened')) return 'opened'
  return 'new'
}

function notify(root, text) {
  root.notices = [...(root.notices || []), { id: newToken().slice(0, 8), text, at: new Date().toISOString(), seenBy: [] }].slice(-30)
}
function noticesFor(link) {
  const root = rootOf(link)
  if (link.parent) return [] // الإشعاراتُ لصاحب الرابط الأصلي
  const out = (root.notices || []).filter((n) => !n.seenBy.includes(link.token))
  out.forEach((n) => n.seenBy.push(link.token))
  if (out.length) saveLinks()
  return out.map(({ text }) => ({ text }))
}

// ════════════ واجهة العميل ════════════
async function clientApi(req, res, token, rest) {
  const link = links[token]
  if (!link || link.revoked || (link.parent && (!links[link.parent] || links[link.parent].revoked))) return send(res, 404, { error: 'not_found' })
  const root = rootOf(link)
  const m = req.method

  if (m === 'GET' && rest === '') {
    return send(res, 200, {
      org: root.org, state: stateOf(root.token), capabilities: AI.capabilities(),
      templates, notices: noticesFor(link), scope: link.stageId ? { taskId: link.taskId, stageId: link.stageId } : null,
    })
  }
  if (m === 'PUT' && rest === '/state') {
    if (limited(token, 'state', 1200)) return send(res, 429, { error: 'rate' })
    const incoming = await body(req, 2_000_000)
    if (!incoming || !Array.isArray(incoming.tasks)) return send(res, 400, { error: 'shape' })
    const before = stateOf(root.token)
    const merged = merge(before, sanitize(incoming))
    // زميلٌ أكمل المرحلة التي أُرسلت إليه: إشعارٌ لصاحب الرابط
    if (link.parent && link.stageId && !link.doneNotified) {
      const t = merged.tasks.find((x) => x.id === link.taskId)
      const s = t?.stages.find((x) => x.id === link.stageId)
      if (s && done(s)) { link.doneNotified = true; notify(root, `أكمل زميلك خصائص «${s.name}».`); (root.events ||= []).push({ name: 'colleague-done', at: new Date().toISOString(), data: { stage: s.name } }) }
    }
    if (link.parent && !link.taskId && merged.tasks.some((t) => t.completed && !(before?.tasks || []).some((b) => b.id === t.id && b.completed))) {
      notify(root, 'أكمل زميلك رسم مهمة.')
    }
    setState(root.token, merged)
    saveLinks()
    return send(res, 200, { ok: true, notices: noticesFor(link) })
  }
  if (m === 'POST' && rest === '/events') {
    if (limited(token, 'events', 2000)) return send(res, 429, { error: 'rate' })
    const e = await body(req, 20_000)
    const name = String(e.name || '').slice(0, 40)
    if (!/^[a-z-]+$/.test(name)) return send(res, 400, { error: 'name' })
    ;(root.events ||= []).push({ name, at: new Date().toISOString(), by: link.parent ? 'colleague' : 'owner', data: e.data && typeof e.data === 'object' ? JSON.parse(JSON.stringify(e.data).slice(0, 400) || '{}') : {} })
    if (root.events.length > 3000) root.events = root.events.slice(-3000)
    saveLinks()
    return send(res, 200, { ok: true })
  }
  if (m === 'POST' && rest === '/booking') {
    if (limited(token, 'booking', 10)) return send(res, 429, { error: 'rate' })
    const b = await body(req, 20_000)
    const contact = String(b.contact || '').trim().slice(0, 120)
    if (!contact) return send(res, 400, { error: 'contact' })
    ;(root.bookings ||= []).push({ at: new Date().toISOString(), contact, name: String(b.name || '').slice(0, 80), time: String(b.time || '').slice(0, 30), note: String(b.note || '').slice(0, 1000), task: String(b.task || '').slice(0, 40) })
    if (root.followup === 'new' || !root.followup) root.followup = 'new'
    saveLinks()
    return send(res, 200, { ok: true })
  }
  if (m === 'POST' && rest === '/share') {
    if (limited(token, 'share', 30)) return send(res, 429, { error: 'rate' })
    const b = await body(req, 5_000)
    const t = newToken()
    links[t] = { token: t, parent: root.token, createdAt: new Date().toISOString(), taskId: b.taskId ? String(b.taskId).slice(0, 40) : null, stageId: b.stageId ? String(b.stageId).slice(0, 40) : null, events: [] }
    ;(root.events ||= []).push({ name: 'shared', at: new Date().toISOString(), data: { stage: !!b.stageId } })
    saveLinks()
    return send(res, 200, { token: t })
  }
  if (m === 'POST' && rest === '/arrange') {
    if (limited(token, 'arrange', 30)) return send(res, 429, { error: 'rate' })
    const b = await body(req, 100_000)
    const tpl = b.templateId ? [...(await import('../js/data.js')).TEMPLATES, ...templates].find((x) => x.id === b.templateId) : null
    const r = await AI.arrange({ story: b.story, dept: b.dept, template: tpl, insert: !!b.insert, context: b.context })
    // النسخةُ الثانية من الثلاث: ناتجُ النموذج — يُحفظ مع المهمة عند المزامنة (`task.arranged`)
    ;(root.events ||= []).push({ name: 'arranged', at: new Date().toISOString(), data: { ok: !!r.result, reason: r.reason || null } })
    saveLinks()
    return send(res, r.result ? 200 : 503, r.result ? { result: r.result } : { fallback: true })
  }
  if (m === 'POST' && rest === '/transcribe') {
    if (limited(token, 'transcribe', 40)) return send(res, 429, { error: 'rate' })
    const buf = await body(req, 8_000_000, true)
    try {
      const text = await AI.transcribe(buf, req.headers['content-type'])
      // المقطعُ لا يُحفظ: يُفرَّغ من الذاكرة ثم يُترك
      return text ? send(res, 200, { text }) : send(res, 503, { fallback: true })
    } catch { return send(res, 503, { fallback: true }) }
  }
  return send(res, 404, { error: 'not_found' })
}

// ════════════ واجهة الفريق ════════════
function summary(l) {
  const st = stateOf(l.token)
  const ev = l.events || []
  const steps = ev.filter((e) => e.name === 'step').map((e) => e.data?.screen)
  return {
    token: l.token, org: l.org, createdAt: l.createdAt, status: linkStatus(l), followup: l.followup || 'new',
    tasks: (st?.tasks || []).length, completed: (st?.tasks || []).filter((t) => t.completed).length,
    bookings: (l.bookings || []).length, lastStep: steps[steps.length - 1] || null,
    lastActivity: ev.length ? ev[ev.length - 1].at : l.createdAt, revoked: !!l.revoked,
    colleagues: Object.values(links).filter((x) => x.parent === l.token).length,
  }
}

async function teamApi(req, res, rest) {
  if (!teamOK(req)) return send(res, 401, { error: 'key' })
  const m = req.method
  const parts = rest.split('/').filter(Boolean)
  if (m === 'GET' && parts[0] === 'links' && !parts[1]) {
    const list = Object.values(links).filter((l) => !l.parent).map(summary).sort((a, b) => (b.lastActivity || '').localeCompare(a.lastActivity || ''))
    // مؤشرات المسار: كم فتح الرابط، وكم بدأ، وكم أكمل، وعند أي خطوة ينسحب العملاء
    const funnel = { links: list.length, opened: 0, started: 0, completed: 0, dropoff: {} }
    for (const l of list) {
      if (l.status !== 'new') funnel.opened++
      if (l.status === 'started' || l.status === 'completed') funnel.started++
      if (l.status === 'completed') funnel.completed++
      else if (l.lastStep && l.status !== 'new') funnel.dropoff[l.lastStep] = (funnel.dropoff[l.lastStep] || 0) + 1
    }
    return send(res, 200, { links: list, funnel })
  }
  if (m === 'POST' && parts[0] === 'links' && !parts[1]) {
    const b = await body(req, 5_000)
    const org = String(b.org || '').trim().slice(0, 120)
    if (!org) return send(res, 400, { error: 'org' })
    const t = newToken()
    links[t] = { token: t, org, createdAt: new Date().toISOString(), events: [], bookings: [], notes: '', followup: 'new', taskNotes: {} }
    saveLinks()
    return send(res, 200, { token: t })
  }
  const l = parts[0] === 'links' && links[parts[1]]
  if (parts[0] === 'links' && (!l || l.parent)) return send(res, 404, { error: 'not_found' })
  if (m === 'GET' && l && !parts[2]) {
    const children = Object.values(links).filter((x) => x.parent === l.token).map((x) => ({ createdAt: x.createdAt, taskId: x.taskId, stageId: x.stageId, done: !!x.doneNotified }))
    return send(res, 200, { link: { ...summary(l), notes: l.notes || '', taskNotes: l.taskNotes || {}, events: (l.events || []).slice(-200), bookings: l.bookings || [] }, state: stateOf(l.token), children })
  }
  if (m === 'PATCH' && l && !parts[2]) {
    const b = await body(req, 50_000)
    if (typeof b.notes === 'string') l.notes = b.notes.slice(0, 20_000)
    if (['new', 'studying', 'scheduled', 'proposal'].includes(b.followup)) l.followup = b.followup
    if (b.taskNotes && typeof b.taskNotes === 'object') for (const [k, v] of Object.entries(b.taskNotes)) (l.taskNotes ||= {})[k] = String(v).slice(0, 10_000)
    if (typeof b.revoked === 'boolean') l.revoked = b.revoked
    saveLinks()
    return send(res, 200, { ok: true })
  }
  if (m === 'GET' && l && parts[2] === 'export') {
    return send(res, 200, { org: l.org, exportedAt: new Date().toISOString(), state: stateOf(l.token), bookings: l.bookings || [], notes: l.notes || '', taskNotes: l.taskNotes || {} },
      { 'content-disposition': `attachment; filename="workflow-${l.token.slice(0, 6)}.json"` })
  }
  if (parts[0] === 'templates') {
    if (m === 'GET') return send(res, 200, { templates })
    if (m === 'DELETE' && parts[1]) {
      const i = templates.findIndex((t) => t.id === parts[1])
      if (i >= 0) templates.splice(i, 1)
      save(tplFile, templates)
      return send(res, 200, { ok: true })
    }
    if (m === 'POST') {
      // مهمةٌ مرسومة تصير قالبًا لمن بعدها: تُجرَّد من خصوصية جهتها (لا ملاحظات ولا مستندات ولا كلام أصلي)
      const b = await body(req, 20_000)
      const src = links[b.token]
      const task = stateOf(src?.token)?.tasks?.find((t) => t.id === b.taskId)
      if (!task) return send(res, 404, { error: 'task' })
      const act = task.stages.filter((s) => s.status !== 'no')
      const idx = new Map(act.map((s, i) => [s.id, i + 1]))
      const known = new Set(['lawyer', 'head', 'assistant', 'dept', 'top', 'firm', 'external'])
      const tpl = {
        id: 'x-' + newToken().slice(0, 10), dept: b.dept === 'general' ? 'general' : 'legal',
        title: String(b.title || task.title).slice(0, 80), sub: String(b.sub || '').slice(0, 80) || 'من خريطة جهة سابقة',
        entry: task.entryHint || '', exit: task.exitHint || '', keywords: String(b.keywords || task.title).slice(0, 200),
        stages: act.map((s) => ({ name: s.name, actor: known.has(s.actor?.v) ? s.actor.v : null, channels: (s.channels?.v || []).filter((c) => c !== 'unknown') })),
        decisions: (task.decisions || []).filter((d) => idx.has(d.after)).map((d) => ({ after: idx.get(d.after), q: d.q, back: d.back ? idx.get(d.back) || null : null, out: d.out || '' })),
        createdAt: new Date().toISOString(),
      }
      templates.push(tpl)
      save(tplFile, templates)
      return send(res, 200, { template: tpl })
    }
  }
  return send(res, 404, { error: 'not_found' })
}

// ════════════ الملفات الساكنة ════════════
async function serveFile(res, rel) {
  const p = normalize(join(ROOT, rel))
  const top = rel.split('/')[0]
  if (!p.startsWith(ROOT + sep) || !PUBLIC.includes(top)) return send(res, 404, { error: 'not_found' })
  try {
    const st = await stat(p)
    if (!st.isFile()) throw new Error()
    const data = await readFile(p)
    res.writeHead(200, {
      'content-type': MIME[extname(p)] || 'application/octet-stream',
      'cache-control': extname(p) === '.woff2' ? 'public, max-age=31536000, immutable' : 'no-cache',
      'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
      ...(extname(p) === '.html' ? { 'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'", 'x-robots-tag': 'noindex' } : {}),
    })
    res.end(data)
  } catch { send(res, 404, { error: 'not_found' }) }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x')
    const path = decodeURIComponent(url.pathname)
    let m
    if ((m = path.match(/^\/api\/link\/([A-Za-z0-9_-]{8,64})(\/[a-z]+)?$/))) return await clientApi(req, res, m[1], m[2] || '')
    if (path.startsWith('/api/team/')) return await teamApi(req, res, path.slice('/api/team/'.length))
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method' })
    if (path === '/' || /^\/r\/[A-Za-z0-9_-]{8,64}\/?$/.test(path)) return serveFile(res, 'index.html')
    if (path === '/team' || path === '/team/') return serveFile(res, 'team.html')
    return serveFile(res, path.replace(/^\/+/, ''))
  } catch (e) {
    send(res, e.code === 413 ? 413 : e.code === 400 ? 400 : 500, { error: 'server' })
    if (!e.code) console.error(e)
  }
})

server.listen(PORT, () => console.log(`رسم سير العمل: http://localhost:${PORT}  ·  لوحة الفريق: http://localhost:${PORT}/team/`))
