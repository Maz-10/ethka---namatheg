// ═══ لوحة فريق إذكاء ═══
// الروابطُ الخاصة وحالاتُها، وكلُّ مهمةٍ بنسخها الثلاث (الكلامُ الأصلي، وناتجُ الترتيب، والخريطةُ بعد التصحيح)،
// والملاحظاتُ الداخلية وحالةُ المتابعة، والتصدير، وتحويلُ مهمةٍ مرسومة إلى قالب، ومؤشراتُ المسار.

import * as R from './render.js'
import * as C from './calc.js'
import { ROLES } from './data.js'

const { esc, n, icon, count, NOUN } = R
const $ = (s) => document.querySelector(s)
const KEY = 'ethka-team-key'
const STATUS = { new: 'لم يُفتح', opened: 'فُتح', started: 'بدأ', completed: 'اكتمل' }
const FOLLOW = { new: 'جديد', studying: 'قيد الدراسة', scheduled: 'حُددت الجلسة', proposal: 'أُرسل المقترح' }
const SCREEN = { welcome: 'الترحيب', pick: 'اختيار المهمة', method: 'طريقة الرسم', story: 'الحكاية', map: 'رسم المراحل', props: 'الخصائص', task: 'أسئلة المهمة', reflect: 'الانعكاس', final: 'السؤال الأخير' }
const date = (s) => (s ? new Intl.DateTimeFormat('ar-SA-u-nu-arab-ca-gregory', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(s)) : '—')
const ui = { key: sessionStorage.getItem(KEY) || '', data: null, detail: null, created: null, tplFor: null, err: '' }

async function api(path, opts = {}) {
  const res = await fetch('/api/team/' + path, { ...opts, headers: { 'content-type': 'application/json', 'x-team-key': ui.key, ...(opts.headers || {}) } })
  if (res.status === 401) { ui.key = ''; sessionStorage.removeItem(KEY); render(); throw new Error('key') }
  if (!res.ok) throw new Error('http ' + res.status)
  return res.json()
}

function toast(text) {
  $('#toast').innerHTML = `<div class="toast" role="status"><span>${esc(text)}</span></div>`
  clearTimeout(toast.t); toast.t = setTimeout(() => ($('#toast').innerHTML = ''), 3500)
}

const head = () => `<header class="top">${R.logo()}<span class="org">لوحة الفريق</span><span class="sp"></span>${ui.key ? `<button class="icon-btn" data-a="logout">خروج</button>` : ''}</header>`

function gate() {
  return `<main><section class="gate">${R.logo()}
    <h1>لوحة فريق إذكاء</h1>
    <form class="q" data-form="key"><label class="ql" for="key">مفتاح الفريق</label>
      <input id="key" class="input" type="password" autocomplete="current-password" dir="ltr">
      ${ui.err ? `<p class="field-err">${esc(ui.err)}</p>` : ''}
      <div class="actions"><button class="btn primary">ادخل</button></div></form>
  </section></main>`
}

function list() {
  const d = ui.data
  if (!d) return `<main><section class="page"><p class="muted">نحمّل الروابط…</p></section></main>`
  const f = d.funnel
  const drop = Object.entries(f.dropoff).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${SCREEN[k] || k}: ${n(v)}`).join('، و')
  return `<main><section class="page">
    <h1>الروابط الخاصة</h1>
    <div class="funnel" role="list">
      <div role="listitem"><b>${n(f.links)}</b><span>الروابط</span></div>
      <div role="listitem"><b>${n(f.opened)}</b><span>فُتحت</span></div>
      <div role="listitem"><b>${n(f.started)}</b><span>بدأ أصحابها</span></div>
      <div role="listitem"><b>${n(f.completed)}</b><span>اكتملت</span></div>
    </div>
    ${drop ? `<p class="drop">توقف من لم يكمل عند: ${esc(drop)}.</p>` : ''}
    <div class="t-grid">
      <div>
        ${d.links.length ? `<table class="links"><thead><tr><th>الجهة</th><th>الحالة</th><th>المتابعة</th><th>المهام</th><th>آخر نشاط</th></tr></thead><tbody>
          ${d.links.map((l) => `<tr><td><a href="#${l.token}" class="org">${esc(l.org)}${l.revoked ? ' <span class="tag">أُلغي</span>' : ''}</a></td>
            <td><a href="#${l.token}"><span class="tag ${l.status}">${STATUS[l.status]}</span></a></td>
            <td><a href="#${l.token}">${FOLLOW[l.followup]}${l.bookings ? ' · طلب جلسة' : ''}</a></td>
            <td><a href="#${l.token}">${n(l.completed)} من ${n(l.tasks)}</a></td>
            <td><a href="#${l.token}">${date(l.lastActivity)}</a></td></tr>`).join('')}
        </tbody></table>` : `<p class="empty-state">لا روابط بعد. أنشئ أول رابط لجهة من النموذج المجاور.</p>`}
      </div>
      <aside class="panel">
        <h2>رابط جديد لجهة</h2>
        <form data-form="create"><label class="ql" for="org">اسم الجهة كما يظهر للعميل</label>
          <input id="org" class="input" autocomplete="off" required>
          <div class="actions"><button class="btn primary">أنشئ الرابط</button></div></form>
        ${ui.created ? `<div class="copy-row"><input class="input" readonly value="${esc(ui.created)}" aria-label="الرابط الجديد"><button class="btn ghost" data-a="copy:${esc(ui.created)}">انسخ</button></div><p class="small muted" style="margin-top:8px">أرسله إلى الجهة عبر واتساب أو البريد. لا يحتاج صاحبه إلى تسجيل دخول.</p>` : ''}
      </aside>
    </div>
  </section></main>`
}

const roleCtx = (state) => {
  const roles = state?.roles || []
  return { roleOf: (id) => ROLES.find((r) => r.id === id) || roles.find((r) => r.id === id) || null, primary: false, customRoles: roles }
}

/** مقياسُ جودة الترتيب: الفرقُ بين ناتج النموذج والخريطة بعد تصحيح العميل. */
function quality(task) {
  const a = task.arranged
  if (!a?.stages?.length) return ''
  const finalNames = new Set(C.activeStages(task).map((s) => s.name))
  const kept = a.stages.filter((s) => finalNames.has(s.name)).length
  let offered = 0, accepted = 0
  for (const s of task.stages) for (const p of ['actor', 'channels', 'work', 'wait', 'friction']) {
    if (s[p]?.ev || (s[p]?.src && s[p].src !== 'user')) offered++
    if (s[p]?.src && s[p].src !== 'user') accepted++
  }
  return `<p class="quality"><b>${n(kept)}</b> من ${count(a.stages.length, NOUN.stagesAcc)} اقترحها الترتيب بقيت بأسمائها، وبقيت ${n(accepted)} قيمة كما اقترحها دون تعديل.</p>`
}

function taskBlock(t, state, link) {
  const c = roleCtx(state)
  const g = t.global || {}
  return `<article class="task-block">
    <header><h2>${esc(t.title)}</h2><span class="tag ${t.completed ? 'completed' : ''}">${t.completed ? 'اكتملت' : 'لم تكتمل'}</span></header>
    ${R.legend(t, c)}
    ${R.trackHTML(t, 'view', c)}
    ${R.numbersHTML(t, c)}
    <dl class="kv">
      <dt>السؤال الأخير</dt><dd>${esc(t.lastQ) || '—'}</dd>
      <dt>الأنظمة المستخدمة</dt><dd>${esc(t.systems) || '—'}</dd>
      <dt>السرية</dt><dd>${g.secret === 'yes' ? 'نعم' : g.secret === 'no' ? 'لا' : '—'}</dd>
      <dt>ما حُذف لحساسيته</dt><dd>${(t.redactions || []).length ? esc(t.redactions.map((x) => ({ person_name: 'اسم شخص', case_number: 'رقم قضية', party_name: 'اسم خصم', email: 'بريد', phone: 'رقم تواصل' }[x] || x)).join('، ')) : '—'}</dd>
    </dl>
    <div class="versions">
      <section class="panel"><h2>الكلام الأصلي</h2>${t.story ? `<p>${esc(t.story)}</p>` : `<p class="muted">${t.source === 'template' ? 'بدأ من قالب، فلا كلام أصلي.' : 'لم يأذن العميل بحفظه.'}</p>`}</section>
      <section class="panel"><h2>ناتج الترتيب</h2>${t.arranged ? `${quality(t)}<details><summary>البيانات كما أخرجها النموذج</summary><pre>${esc(JSON.stringify(t.arranged, null, 1))}</pre></details>` : '<p class="muted">لم تُرتَّب بالنموذج.</p>'}</section>
      <section class="panel"><h2>الخريطة بعد التصحيح</h2><p>${count(C.activeStages(t).length, NOUN.stages)}، و${count((t.decisions || []).length, ['نقطة قرار واحدة', 'نقطتا قرار', 'نقاط قرار', 'نقطة قرار'])}.</p>${t.final ? `<p class="muted">اكتملت ${date(t.final.at)}</p>` : ''}</section>
    </div>
    <div class="q"><label class="ql" for="tn-${t.id}">ملاحظة داخلية على هذه المهمة</label><textarea id="tn-${t.id}" class="textarea short" data-tn="${t.id}">${esc(link.taskNotes?.[t.id] || '')}</textarea></div>
    <div class="actions">
      <button class="btn ghost" data-a="print:${t.id}">${icon('print', 18)}اطبع الخريطة</button>
      <button class="btn ghost" data-a="tpl:${t.id}">حوّلها إلى قالب</button>
    </div>
    ${ui.tplFor === t.id ? `<form class="panel" data-form="tpl" data-task="${t.id}" style="margin-top:14px">
      <h2>قالب جديد من هذه المهمة</h2><p class="small muted">تُجرَّد من خصوصية الجهة: تبقى المراحل والأدوار والوسائل ونقاط القرار، وتسقط الملاحظات والمستندات والكلام الأصلي.</p>
      <div class="q"><label class="ql" for="tt">العنوان</label><input id="tt" class="input" name="title" value="${esc(t.title)}"></div>
      <div class="q"><label class="ql" for="ts">سطر وصفه</label><input id="ts" class="input" name="sub" placeholder="مثل: من وروده إلى إقفاله"></div>
      <div class="q"><label class="ql" for="tk">كلمات البحث</label><input id="tk" class="input" name="keywords" placeholder="كلمات يبحث بها العميل"></div>
      <div class="q"><span class="ql">الإدارة</span><div class="chips"><label class="chip"><input type="radio" name="dept" value="legal" checked> الإدارة القانونية</label><label class="chip"><input type="radio" name="dept" value="general"> إدارة أخرى</label></div></div>
      <div class="actions"><button class="btn primary">أضفه إلى القوالب</button><button type="button" class="btn link" data-a="tpl-cancel">إلغاء</button></div></form>` : ''}
  </article>`
}

function detail() {
  const d = ui.detail
  if (!d) return `<main><section class="page"><p class="muted">نحمّل الجهة…</p></section></main>`
  const l = d.link
  const url = location.origin + '/r/' + l.token
  const tasks = d.state?.tasks || []
  return `<main><section class="page">
    <a class="back-link" href="#">${icon('back', 16)}كل الروابط</a>
    <h1>${esc(l.org)}</h1>
    <div class="t-grid">
      <div>
        <div class="q"><span class="ql">حالة المتابعة</span><div class="seg" role="group" aria-label="حالة المتابعة">${Object.entries(FOLLOW).map(([k, v]) => `<button data-a="follow:${k}" aria-pressed="${l.followup === k}">${v}</button>`).join('')}</div></div>
        <div class="q"><label class="ql" for="notes">ملاحظات الفريق الداخلية</label><textarea id="notes" class="textarea" data-notes>${esc(l.notes)}</textarea></div>
        ${tasks.length ? tasks.map((t) => taskBlock(t, d.state, l)).join('') : `<p class="empty-state">لم ترسم الجهة مهمة بعد. الحالة: ${STATUS[l.status]}.</p>`}
      </div>
      <aside>
        <div class="panel"><h2>الرابط</h2><div class="copy-row"><input class="input" readonly value="${esc(url)}" aria-label="رابط الجهة"><button class="btn ghost" data-a="copy:${esc(url)}">انسخ</button></div>
          <dl class="kv"><dt>الحالة</dt><dd>${STATUS[l.status]}</dd><dt>أُنشئ</dt><dd>${date(l.createdAt)}</dd><dt>آخر نشاط</dt><dd>${date(l.lastActivity)}</dd><dt>آخر خطوة</dt><dd>${SCREEN[l.lastStep] || '—'}</dd><dt>روابط الزملاء</dt><dd>${n(d.children.length)}${d.children.filter((c) => c.done).length ? `، أكمل منها ${n(d.children.filter((c) => c.done).length)}` : ''}</dd></dl>
          <div class="actions"><a class="btn ghost" href="/api/team/links/${l.token}/export" data-a="export:${l.token}">صدّر البيانات</a><button class="btn link" data-a="revoke:${l.revoked ? 0 : 1}">${l.revoked ? 'أعد تفعيل الرابط' : 'ألغِ الرابط'}</button></div></div>
        <div class="panel" style="margin-top:14px"><h2>طلبات الجلسة</h2>${l.bookings.length ? l.bookings.map((b) => `<dl class="kv"><dt>التواصل</dt><dd dir="auto">${esc(b.contact)}</dd><dt>الاسم</dt><dd>${esc(b.name) || '—'}</dd><dt>الوقت الأنسب</dt><dd>${esc(b.time) || '—'}</dd><dt>ملاحظة</dt><dd>${esc(b.note) || '—'}</dd><dt>وصل</dt><dd>${date(b.at)}</dd></dl>`).join('<hr class="rule">') : '<p class="small muted">لا طلبات بعد.</p>'}</div>
      </aside>
    </div>
  </section></main>`
}

function render() {
  const token = location.hash.slice(1)
  $('#app').innerHTML = head() + (!ui.key ? gate() : token ? detail() : list())
  requestAnimationFrame(R.drawArrows)
}

async function load() {
  if (!ui.key) return render()
  const token = location.hash.slice(1)
  try {
    if (token) { ui.detail = null; render(); ui.detail = await api('links/' + token) }
    else { ui.data = await api('links') }
  } catch (e) { if (e.message !== 'key') toast('تعذّر التحميل. حدّث الصفحة بعد قليل.') }
  render()
}

document.addEventListener('submit', async (e) => {
  e.preventDefault()
  const f = e.target
  if (f.dataset.form === 'key') {
    ui.key = f.querySelector('#key').value.trim(); ui.err = ''
    try { await api('links'); sessionStorage.setItem(KEY, ui.key); load() } catch { ui.err = 'المفتاح غير صحيح.'; render() }
  }
  if (f.dataset.form === 'create') {
    const org = f.querySelector('#org').value.trim()
    if (!org) return
    const r = await api('links', { method: 'POST', body: JSON.stringify({ org }) })
    ui.created = location.origin + '/r/' + r.token
    load()
  }
  if (f.dataset.form === 'tpl') {
    const fd = new FormData(f)
    await api('templates', { method: 'POST', body: JSON.stringify({ token: ui.detail.link.token, taskId: f.dataset.task, title: fd.get('title'), sub: fd.get('sub'), keywords: fd.get('keywords'), dept: fd.get('dept') }) })
    ui.tplFor = null; toast('أُضيف القالب، ويظهر للعملاء في قائمة المهام.'); render()
  }
})

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-a]')
  if (!el) return
  const [a, ...args] = el.dataset.a.split(':')
  const arg = args.join(':')
  if (a === 'export') {
    e.preventDefault()
    const res = await fetch(el.getAttribute('href'), { headers: { 'x-team-key': ui.key } })
    const blob = await res.blob()
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `خرائط-${ui.detail.link.org}.json`; link.click()
    return
  }
  e.preventDefault()
  if (a === 'logout') { ui.key = ''; sessionStorage.removeItem(KEY); render() }
  if (a === 'copy') { try { await navigator.clipboard.writeText(arg); toast('نُسخ الرابط') } catch { toast('انسخه يدويًّا من الحقل') } }
  if (a === 'follow') { await api('links/' + ui.detail.link.token, { method: 'PATCH', body: JSON.stringify({ followup: arg }) }); ui.detail.link.followup = arg; render() }
  if (a === 'revoke') { await api('links/' + ui.detail.link.token, { method: 'PATCH', body: JSON.stringify({ revoked: arg === '1' }) }); load() }
  if (a === 'tpl') { ui.tplFor = arg; render() }
  if (a === 'tpl-cancel') { ui.tplFor = null; render() }
  if (a === 'print') {
    const t = ui.detail.state.tasks.find((x) => x.id === arg)
    $('#print').innerHTML = R.printHTML(t, { ...roleCtx(ui.detail.state), org: ui.detail.link.org })
    window.print()
  }
})

// الملاحظاتُ تُحفظ عند مغادرة الحقل
document.addEventListener('focusout', async (e) => {
  const el = e.target
  if (!ui.detail) return
  if (el.matches('[data-notes]')) { await api('links/' + ui.detail.link.token, { method: 'PATCH', body: JSON.stringify({ notes: el.value }) }); toast('حُفظت الملاحظات') }
  if (el.matches('[data-tn]')) { await api('links/' + ui.detail.link.token, { method: 'PATCH', body: JSON.stringify({ taskNotes: { [el.dataset.tn]: el.value } }) }); ui.detail.link.taskNotes[el.dataset.tn] = el.value; toast('حُفظت الملاحظة') }
})

addEventListener('hashchange', load)
addEventListener('resize', () => requestAnimationFrame(R.drawArrows))
load()
