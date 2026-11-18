// ═══ نسخةُ العرض — خادمٌ محاكًى داخل المتصفح ═══
// للتحقق من العمل حيث لا خادم (صفحةُ عرضٍ ساكنة): يعترض طلبات ‎/api/‎ ويجيب عنها من ذاكرة هذا المتصفح،
// بالمنطق نفسه الذي في `server/server.mjs` مختصرًا، ويستدعي وحداتِ الخادم الحقيقية للتحقق والحذف ومزوّدِ التطوير.
// لا يُستعمل مع عميلٍ حقيقي: البيانات لا تغادر المتصفح، ولا يراها غيرُ صاحبه.
(function () {
  var TOKEN = 'demo-heya-tajriba'
  var KEY = 'ethka-demo-server'
  window.ETHKA_DEMO_TOKEN = TOKEN
  try { sessionStorage.setItem('ethka-team-key', 'عرض') } catch (e) {}

  var mem = null
  function load() {
    if (mem) return mem
    try { mem = JSON.parse(localStorage.getItem(KEY) || 'null') } catch (e) { mem = null }
    if (!mem) {
      mem = { links: {}, states: {}, templates: [] }
      mem.links[TOKEN] = { token: TOKEN, org: 'الهيئة العامة للتجربة', createdAt: new Date().toISOString(), events: [], bookings: [], notes: '', followup: 'new', taskNotes: {} }
    }
    return mem
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)) } catch (e) {} }
  var mods = null
  function modules() {
    if (!mods) mods = Promise.all([import(new URL('server/arrange/schema.mjs', document.baseURI).href), import(new URL('server/redact.mjs', document.baseURI).href), import(new URL('server/arrange/providers/fixture.mjs', document.baseURI).href)])
    return mods
  }
  function reply(code, body) { return new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json' } }) }
  function rand() { var s = 'abcdefghijklmnopqrstuvwxyz'; var o = 'demo-'; for (var i = 0; i < 12; i++) o += s[Math.floor(Math.random() * 26)]; return o }
  function root(l) { return l.parent ? load().links[l.parent] : l }
  function merge(stored, inc) {
    if (!stored) return inc
    var tasks = {}; (stored.tasks || []).forEach(function (t) { tasks[t.id] = t })
    ;(inc.tasks || []).forEach(function (t) { if (!tasks[t.id] || (t.updatedAt || 0) >= (tasks[t.id].updatedAt || 0)) tasks[t.id] = t })
    var roles = {}; (stored.roles || []).concat(inc.roles || []).forEach(function (r) { roles[r.id] = r })
    var newer = (inc.updatedAt || 0) >= (stored.updatedAt || 0) ? inc : stored
    return Object.assign({}, newer, { tasks: Object.values(tasks), roles: Object.values(roles) })
  }
  function status(l) {
    var st = load().states[l.token]; var tasks = (st && st.tasks) || []; var ev = l.events || []
    if (tasks.some(function (t) { return t.completed })) return 'completed'
    if (tasks.length || ev.some(function (e) { return e.name === 'start' })) return 'started'
    if (ev.some(function (e) { return e.name === 'opened' })) return 'opened'
    return 'new'
  }
  function summary(l) {
    var st = load().states[l.token]; var tasks = (st && st.tasks) || []; var ev = l.events || []
    var steps = ev.filter(function (e) { return e.name === 'step' }).map(function (e) { return e.data && e.data.screen })
    return { token: l.token, org: l.org, createdAt: l.createdAt, status: status(l), followup: l.followup || 'new', tasks: tasks.length,
      completed: tasks.filter(function (t) { return t.completed }).length, bookings: (l.bookings || []).length, lastStep: steps[steps.length - 1] || null,
      lastActivity: ev.length ? ev[ev.length - 1].at : l.createdAt, revoked: !!l.revoked,
      colleagues: Object.values(load().links).filter(function (x) { return x.parent === l.token }).length }
  }

  async function client(token, rest, method, body) {
    var db = load(); var l = db.links[token]
    if (!l || l.revoked) return reply(404, { error: 'not_found' })
    var r = root(l)
    if (method === 'GET' && !rest) return reply(200, { org: r.org, state: db.states[r.token] || null, capabilities: { arrange: true, transcribe: false }, templates: db.templates, notices: [] })
    if (method === 'PUT' && rest === '/state') {
      var red = (await modules())[1]
      var s = JSON.parse(JSON.stringify(body)); s.screen = undefined; s.cur = undefined
      ;(s.tasks || []).forEach(function (t) { if (!t.keepStory) t.story = ''; red.redactTask(t) })
      db.states[r.token] = merge(db.states[r.token], s); save()
      return reply(200, { ok: true, notices: [] })
    }
    if (method === 'POST' && rest === '/events') { (r.events = r.events || []).push({ name: body.name, at: new Date().toISOString(), data: body.data || {} }); save(); return reply(200, { ok: true }) }
    if (method === 'POST' && rest === '/booking') { (r.bookings = r.bookings || []).push(Object.assign({ at: new Date().toISOString() }, body)); save(); return reply(200, { ok: true }) }
    if (method === 'POST' && rest === '/share') { var t = rand(); db.links[t] = { token: t, parent: r.token, createdAt: new Date().toISOString(), taskId: body.taskId || null, stageId: body.stageId || null, events: [] }; save(); return reply(200, { token: t }) }
    if (method === 'POST' && rest === '/arrange') {
      var m = await modules(); var story = m[1].redact(String(body.story || '')).text
      var raw = await m[2].complete({ story: story })
      try { var out = m[0].validate(raw, story); return out.stages.length ? reply(200, { result: out }) : reply(503, { fallback: true }) } catch (e) { return reply(503, { fallback: true }) }
    }
    return reply(503, { fallback: true })
  }

  async function team(rest, method, body) {
    var db = load(); var parts = rest.split('/').filter(Boolean)
    if (parts[0] === 'links' && !parts[1] && method === 'GET') {
      var list = Object.values(db.links).filter(function (l) { return !l.parent }).map(summary)
      var f = { links: list.length, opened: 0, started: 0, completed: 0, dropoff: {} }
      list.forEach(function (l) {
        if (l.status !== 'new') f.opened++
        if (l.status === 'started' || l.status === 'completed') f.started++
        if (l.status === 'completed') f.completed++
        else if (l.lastStep && l.status !== 'new') f.dropoff[l.lastStep] = (f.dropoff[l.lastStep] || 0) + 1
      })
      return reply(200, { links: list, funnel: f })
    }
    if (parts[0] === 'links' && !parts[1] && method === 'POST') { var t = rand(); db.links[t] = { token: t, org: String(body.org || '').slice(0, 120), createdAt: new Date().toISOString(), events: [], bookings: [], notes: '', followup: 'new', taskNotes: {} }; save(); return reply(200, { token: t }) }
    var l = parts[0] === 'links' && db.links[parts[1]]
    if (l && method === 'GET' && parts[2] === 'export') return reply(200, { org: l.org, state: db.states[l.token] || null, bookings: l.bookings || [] })
    if (l && method === 'GET') {
      var children = Object.values(db.links).filter(function (x) { return x.parent === l.token }).map(function (x) { return { createdAt: x.createdAt, taskId: x.taskId, stageId: x.stageId, done: false } })
      return reply(200, { link: Object.assign(summary(l), { notes: l.notes || '', taskNotes: l.taskNotes || {}, events: (l.events || []).slice(-200), bookings: l.bookings || [] }), state: db.states[l.token] || null, children: children })
    }
    if (l && method === 'PATCH') {
      if (typeof body.notes === 'string') l.notes = body.notes
      if (body.followup) l.followup = body.followup
      if (body.taskNotes) Object.assign(l.taskNotes = l.taskNotes || {}, body.taskNotes)
      if (typeof body.revoked === 'boolean') l.revoked = body.revoked
      save(); return reply(200, { ok: true })
    }
    if (parts[0] === 'templates' && method === 'POST') {
      var st = db.states[body.token]; var task = st && st.tasks.find(function (x) { return x.id === body.taskId })
      if (!task) return reply(404, { error: 'task' })
      var act = task.stages.filter(function (s) { return s.status !== 'no' }); var idx = {}; act.forEach(function (s, i) { idx[s.id] = i + 1 })
      var tpl = { id: 'x-' + rand(), dept: body.dept === 'general' ? 'general' : 'legal', title: body.title || task.title, sub: body.sub || 'من خريطة جهة سابقة', entry: task.entryHint || '', exit: task.exitHint || '', keywords: body.keywords || task.title,
        stages: act.map(function (s) { return { name: s.name, actor: s.actor && s.actor.v && s.actor.v.length < 12 ? s.actor.v : null, channels: (s.channels && s.channels.v || []).filter(function (c) { return c !== 'unknown' }) } }),
        decisions: (task.decisions || []).filter(function (d) { return idx[d.after] }).map(function (d) { return { after: idx[d.after], q: d.q, back: d.back ? idx[d.back] || null : null, out: d.out || '' } }) }
      db.templates.push(tpl); save(); return reply(200, { template: tpl })
    }
    return reply(404, { error: 'not_found' })
  }

  var realFetch = window.fetch.bind(window)
  window.fetch = async function (input, init) {
    var url = new URL(typeof input === 'string' ? input : input.url, location.href)
    var path = decodeURIComponent(url.pathname); var i = path.indexOf('/api/')
    if (i < 0) return realFetch(input, init)
    path = path.slice(i)
    init = init || {}
    var method = (init.method || 'GET').toUpperCase()
    var body = {}; try { body = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : {} } catch (e) {}
    await new Promise(function (r) { setTimeout(r, 120) })
    var m = path.match(/^\/api\/link\/([A-Za-z0-9_-]+)(\/[a-z]+)?$/)
    if (m) return client(m[1], m[2] || '', method, body)
    if (path.indexOf('/api/team/') === 0) return team(path.slice(10), method, body)
    return reply(404, { error: 'not_found' })
  }
})()
