// ═══ الرسم المشترك — صفحة العميل ولوحة الفريق ترسمان الخريطة نفسها من هنا ═══
// لا تقرأ هذه الوحدة الحالة: كلُّ ما تحتاجه يصلها في `ctx` (دليلُ الأدوار، والمرحلة المحددة، ووضعُ العرض).

import * as D from './data.js'
import * as C from './calc.js'
import { D_NAME, D_NAME_GOLD, D_DOTS, D_DIAMOND, BOX } from './logo.js'

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const NF = new Intl.NumberFormat('ar-SA-u-nu-arab', { maximumFractionDigits: 1 })
export const n = (x) => NF.format(x)
export const pct = (x) => new Intl.NumberFormat('ar-SA-u-nu-arab', { style: 'percent', maximumFractionDigits: 0 }).format(x)
export const byId = (list, id) => list.find((x) => x.id === id)
export const isUnknown = (v) => v === D.UNKNOWN

/** العددُ والمعدود: «مرة واحدة»، «مرتان»، «٣ مرات»، «١٢ مرة».
 *  forms: [المفرد مع «واحد»، المثنى، جمعٌ لما بين ٣ و١٠، مفردٌ لما فوقها] */
export function count(x, [one, two, few, many]) {
  if (x === 1) return one
  if (x === 2) return two
  const r = Math.round(x) % 100
  return `${n(x)} ${r >= 3 && r <= 10 ? few : many}`
}
export const NOUN = {
  times: ['مرة واحدة', 'مرتين', 'مرات', 'مرة'],
  days: ['يوم واحد', 'يومان', 'أيام', 'يومًا'],
  daysAcc: ['يومًا واحدًا', 'يومين', 'أيام', 'يومًا'],
  roles: ['دور واحد', 'دورين', 'أدوار', 'دورًا'],
  spots: ['موضع واحد', 'موضعين', 'مواضع', 'موضعًا'],
  stages: ['مرحلة واحدة', 'مرحلتان', 'مراحل', 'مرحلة'],
  stagesAcc: ['مرحلة واحدة', 'مرحلتين', 'مراحل', 'مرحلة'],
  words: ['كلمة واحدة', 'كلمتان', 'كلمات', 'كلمة'],
  hands: ['يد واحدة', 'يدين', 'أيدٍ', 'يدًا'],
}

// ── الأيقونات: مرسومةٌ بخطٍّ واحد وسُمكٍ واحد، لا رموزٌ نصية
const PATHS = {
  undo: '<path d="M15 5l5 5-5 5"/><path d="M20 10H10a5 5 0 0 0 0 10h3"/>',
  grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
  forward: '<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>',
  back: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
  print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="1.5"/><path d="M7 14h10v6.5H7z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  add: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M12 8v8M8 12h8"/>',
  send: '<path d="M20.5 3.5L3.5 10.5l7 3 3 7z"/><path d="M10.5 13.5l10-10"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  dot: '<circle cx="12" cy="12" r="3.5"/>',
}
export function icon(name, size = 20, label = '') {
  const fill = name === 'grip' || name === 'dot' ? 'currentColor' : 'none'
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${fill === 'none' ? 'currentColor' : 'none'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}>${PATHS[name]}</svg>`
}

export function logo(kind = 'lockup', cls = 'logo') {
  const parts = kind === 'lockup'
    ? `<path d="${D_NAME}" fill="var(--ink)"/><path d="${D_NAME_GOLD}" fill="var(--gold)"/><path d="${D_DOTS}" fill="var(--ink)"/><path d="${D_DIAMOND}" fill="var(--gold)"/>`
    : `<path d="${D_DIAMOND}" fill="var(--gold)"/>`
  return `<svg class="${cls}" viewBox="${BOX[kind]}" role="img" aria-label="إذكاء">${parts}</svg>`
}

export const shape = (role) => (role ? `<i class="sh ${role.shape}" style="--c:${role.color}" aria-hidden="true"></i>` : '')
export const chip = (a, label, pressed, extra = '') =>
  `<button type="button" class="chip ${extra}" data-a="${esc(a)}" aria-pressed="${pressed ? 'true' : 'false'}">${label}</button>`
export const unk = (a, pressed) => chip(a, 'لا أعرف', pressed, 'unk')

// ── المسار

/** هيئةُ القيمة: المؤكَّدة عادية، والمستنتجة بنقطة، والمقترحة باهتة. */
const look = (src) => (src === 'suggested' ? 'sug' : src === 'inferred' ? 'inf' : '')

export function marksOf(s, ctx) {
  const role = ctx.roleOf(s.actor.v)
  const ch = s.channels.v.filter((c) => c !== D.UNKNOWN).map((c) => byId(D.CHANNELS, c)?.label).filter(Boolean)
  const work = byId(D.WORK, s.work.v)
  const fr = s.friction.v
  const out = []
  out.push(role ? `<span class="${look(s.actor.src)}">${shape(role)}${esc(role.label)}</span>`
    : isUnknown(s.actor.v) ? `<span class="faint">المنفّذ غير معروف</span>` : `<span class="faint">من يتولاها؟</span>`)
  if (ch.length) out.push(`<span class="${look(s.channels.src)}">${esc(ch.join(' و'))}</span>`)
  if (work) out.push(`<span class="${look(s.work.src)}">${work.short}</span>`)
  if (fr === 'often') out.push(`<span class="fric"><i class="fd" aria-hidden="true"></i>تتعطل كثيرًا</span>`)
  else if (fr === 'sometimes') out.push(`<span class="fric soft">تتعطل أحيانًا</span>`)
  return out.join('')
}

export function trackHTML(task, mode, ctx) {
  const edit = mode === 'map' || mode === 'props'
  const stages = task.stages.filter((s) => edit || s.status !== 'no')
  const g = task.global
  const entryLabel = g.entry.length && !g.entry.includes(D.UNKNOWN) ? g.entry.map((e) => byId(D.ENTRY, e)?.label).join(' و') : task.entryHint
  const exitLabel = g.exit && g.exit !== D.UNKNOWN ? (g.exit === 'other' && g.exitOther ? g.exitOther : byId(D.EXIT, g.exit)?.label) : task.exitHint
  const clar = (task.clarifications || []).filter((q) => !q.done)
  let html = ''
  if (entryLabel) html += `<div class="end-pill"><span>البداية</span><b>${esc(entryLabel)}</b></div>`
  let prevActive = null
  let num = 0
  stages.forEach((s, i) => {
    if (s.status === 'no') {
      html += gapHTML(null, null, i, edit, false, ctx)
      html += `<div class="folded" data-sid="${s.id}"><s>${esc(s.name)}</s><button class="btn link" data-a="st-restore:${s.id}">استرجعها</button></div>`
      return
    }
    num++
    html += gapHTML(s, prevActive, i, edit, i > 0 || !!entryLabel, ctx)
    html += cardHTML(s, num, mode, ctx, clar.filter((q) => q.target.split('.')[0] === s.id))
    for (const d of task.decisions.filter((x) => x.after === s.id)) html += decHTML(d, task, edit)
    prevActive = s
  })
  if (edit) html += `<button class="plus end" data-a="add:${task.stages.length}">${icon('plus', 18)}أضف مرحلة في آخر المسار</button>`
  if (exitLabel) html += `${edit ? '' : '<div class="gap still" style="--len:28px"></div>'}<div class="end-pill"><span>النهاية</span><b>${esc(exitLabel)}</b></div>`
  const id = ctx.primary ? 'id="track"' : ''
  return `<div class="track-wrap" ${ctx.primary ? 'id="track-wrap"' : ''}><div class="track" ${id} data-mode="${mode}">${html}<svg class="arrows" aria-hidden="true"></svg></div></div>`
}

function gapHTML(s, prev, index, edit, show, ctx) {
  const plus = edit ? `<button class="plus" data-a="add:${index}" aria-label="أضف مرحلة هنا">${icon('plus', 16)}</button>` : ''
  if (!s || !show) return edit ? `<div class="gap still" style="--len:${index > 0 ? 32 : 20}px">${plus}</div>` : ''
  let hand = ''
  const pa = prev?.actor.v, sa = s.actor.v
  if (pa && sa && pa !== sa && !isUnknown(pa) && !isUnknown(sa)) {
    const ext = ctx.roleOf(pa)?.scope === 'external' || ctx.roleOf(sa)?.scope === 'external'
    hand = `<span class="hand ${ext ? 'external' : ''}" title="تنتقل المهمة هنا إلى يد أخرى">${icon('forward', 12, 'انتقال إلى يد أخرى')}</span>`
  }
  return `<div class="gap" style="--len:36px">${hand}${plus}</div>`
}

function cardHTML(s, num, mode, ctx, clar) {
  const role = ctx.roleOf(s.actor.v)
  const pending = s.status === 'pending'
  const edit = mode === 'map' || mode === 'props'
  const cls = ['card', s.status === 'sometimes' ? 'cond' : '', pending ? 'pending' : '', s.guide ? 'guide' : '',
    s.friction.v === 'often' ? 'hot' : '', ctx.selected === s.id ? 'selected' : '', ctx.grown === s.id ? 'grow' : ''].join(' ')
  const style = role ? `--actor:${role.color}` : ''
  const attrs = `style="${style}"`
  const ask = pending && edit ? `<div class="ask"><span class="lbl">هل تمرّون بها؟</span>
      ${chip('st-yes:' + s.id, 'نعم', false)}${chip('st-no:' + s.id, 'لا', false)}${chip('st-some:' + s.id, 'أحيانًا', false)}</div>` : ''
  const cond = s.status === 'sometimes' ? `<span class="cond-tag">${s.condition ? 'تحدث ' + esc(s.condition) : 'تحدث أحيانًا'}</span>` : ''
  const qs = edit && clar.length ? clar.map((q) => `<div class="clar"><span class="lbl">${esc(q.question)}</span><div class="chips">${q.options.map((o, k) => chip(`clar:${q.id}:${k}`, esc(o), false)).join('')}${unk(`clar:${q.id}:-1`, false)}</div></div>`).join('') : ''
  return `<article class="${cls}" data-sid="${s.id}" ${attrs}>
    ${edit ? `<button class="open" data-a="open:${s.id}" aria-label="خصائص مرحلة ${esc(s.name)}"></button>` : ''}
    <div class="row">
      <span class="num">${n(num)}</span>
      <span class="nm">${esc(s.name)}</span>
      ${edit ? `<button class="grip" data-grip="${s.id}" aria-label="اسحب لتغيير ترتيب المرحلة">${icon('grip', 18)}</button>` : ''}
    </div>
    ${cond ? `<div class="marks">${cond}</div>` : ''}
    ${!pending && !s.guide ? `<div class="marks">${marksOf(s, ctx)}</div>` : ''}
    ${ask}${qs}
  </article>`
}

function decHTML(d, task, edit) {
  const back = task.stages.find((s) => s.id === d.back)
  const branch = back ? `وإلا رجعت إلى «${esc(back.name)}»` : d.out ? `وإلا: ${esc(d.out)}` : ''
  const freq = d.common === 'common' ? '، ويتكرر هذا كثيرًا' : d.common === 'rare' ? '، ونادرًا ما يحدث' : ''
  return `<div class="dec" data-did="${d.id}" ${back ? `data-back="${back.id}"` : ''}>
    ${edit ? `<button class="edit" data-a="dec-open:${d.id}" aria-label="عدّل نقطة القرار: ${esc(d.q)}"></button>` : ''}
    <span class="dia" aria-hidden="true"><span>؟</span></span>
    <span class="body"><b>${esc(d.q)}</b><span class="br">${branch}${freq}</span></span>
  </div>`
}

/** أسهمُ الرجوع: تُرسم بعد التخطيط بقياس المواضع، لكل مسارٍ في الصفحة. */
export function drawArrows() { document.querySelectorAll('.track').forEach(drawArrowsFor) }
function drawArrowsFor(track) {
  const svg = track.querySelector('.arrows')
  if (!svg) return
  const tb = track.getBoundingClientRect()
  const horizontal = getComputedStyle(track).flexDirection === 'row'
  let paths = ''
  track.querySelectorAll('.dec[data-back]').forEach((dec) => {
    const target = track.querySelector(`.card[data-sid="${dec.dataset.back}"]`)
    if (!target) return
    const a = dec.querySelector('.dia').getBoundingClientRect()
    const b = target.getBoundingClientRect()
    if (horizontal) {
      const x1 = a.left + a.width / 2 - tb.left, y1 = a.top - tb.top - 6
      const x2 = b.left + b.width / 2 - tb.left, y2 = b.top - tb.top - 4
      const lift = Math.min(70, 30 + Math.abs(x2 - x1) / 10)
      paths += `<path d="M${x1},${y1} C${x1},${y1 - lift} ${x2},${y2 - lift} ${x2},${y2}"/><path class="head" d="M${x2 - 4},${y2 - 8} L${x2 + 4},${y2 - 8} L${x2},${y2} Z"/>`
    } else {
      // الجوال: المسارُ عموديّ، والسهمُ يلتفّ في الهامش الأيسر
      const row = dec.getBoundingClientRect()
      const x1 = row.left - tb.left - 2, y1 = a.top + a.height / 2 - tb.top
      const x2 = b.left - tb.left - 2, y2 = b.top + 22 - tb.top
      const out = Math.max(8, Math.min(x1, x2) - 30)
      paths += `<path d="M${x1},${y1} C${out},${y1} ${out},${y2} ${x2},${y2}"/><path class="head" d="M${x2 - 8},${y2 - 4} L${x2 - 8},${y2 + 4} L${x2},${y2} Z"/>`
    }
  })
  svg.setAttribute('width', track.scrollWidth); svg.setAttribute('height', track.scrollHeight)
  svg.innerHTML = paths
}

export function legend(task, ctx) {
  const used = [...new Set(C.activeStages(task).map((s) => s.actor.v).filter((v) => v && !isUnknown(v)))].map(ctx.roleOf).filter(Boolean)
  if (!used.length) return ''
  return `<div class="legend" aria-label="مفتاح الخريطة">${used.map((r) => `<span>${shape(r)}${esc(r.label)}</span>`).join('')}<span><i class="fd" aria-hidden="true"></i>تتعطل كثيرًا</span><span class="hand-key">${icon('forward', 12)}انتقال إلى يد أخرى</span></div>`
}

/** الأرقام: سجلٌّ مدوَّن لا بطاقاتٌ متماثلة. */
export function numbersHTML(task, ctx) {
  const N = C.computeNumbers(task)
  const H = C.handoffs(task, ctx.customRoles || [])
  const hr = C.range(N.monthlyHours)
  const once = N.workHours > 0 ? Math.max(1, Math.round(N.workHours)) : null
  const rows = []
  rows.push(hr
    ? `<div class="led key"><dt>ساعات العمل في الشهر</dt><dd><b>${n(hr[0])}–${n(hr[1])}</b> ساعة<span>تمر المهمة بكم نحو ${count(N.times, NOUN.times)} في الشهر</span></dd></div>`
    : `<div class="led"><dt>ساعات العمل في الشهر</dt><dd class="missing">تحتاج جوابًا عن تكرار المهمة ومدة مراحلها</dd></div>`)
  rows.push(once
    ? `<div class="led"><dt>العمل في المرة الواحدة</dt><dd><b>${once === 1 ? 'نحو ساعة' : once === 2 ? 'نحو ساعتين' : 'نحو ' + n(once)}</b>${once > 2 ? (once <= 10 ? ' ساعات' : ' ساعة') : ''}<span>مجموع العمل الفعلي في مراحلها</span></dd></div>`
    : `<div class="led"><dt>العمل في المرة الواحدة</dt><dd class="missing">يحتاج مدة العمل في المراحل</dd></div>`)
  rows.push(`<div class="led"><dt>الانتقال بين الأيدي</dt><dd><b>${n(H.list.length)}</b> ${H.list.length >= 3 && H.list.length <= 10 ? 'مواضع' : 'موضعًا'}<span>بين ${count(Math.max(H.roles, 1), NOUN.roles)}</span></dd></div>`)
  return `<dl class="ledger">${rows.join('')}</dl>
    <p class="est-note">كل رقم هنا تقدير مبني على إجاباتك، ولذلك يُعرض نطاقًا أو قيمة تقريبية.</p>
    ${N.unknownWork ? `<p class="small muted gap-note">لم تُحدَّد مدة العمل في ${count(N.unknownWork, NOUN.spots)}، فلم تدخل الحساب، والأرقام أقل من حقيقتها بقدرها.</p>` : ''}`
}

/** الملف القابل للطباعة. */
export function printHTML(task, ctx) {
  const N = C.computeNumbers(task); const hr = C.range(N.monthlyHours); const H = C.handoffs(task, ctx.customRoles || [])
  const rows = []
  C.activeStages(task).forEach((s, i) => {
    const role = ctx.roleOf(s.actor.v)
    rows.push(`<tr><td class="n">${n(i + 1)}</td><td class="nm">${esc(s.name)}${s.status === 'sometimes' ? ' <span class="muted">(أحيانًا)</span>' : ''}</td><td data-l="من يتولاها">${role ? shape(role) + esc(role.label) : '—'}</td>
      <td data-l="الوسيلة">${esc(s.channels.v.map((c) => byId(D.CHANNELS, c)?.label).filter(Boolean).join(' و') || '—')}</td><td data-l="العمل الفعلي">${byId(D.WORK, s.work.v)?.label || '—'}</td>
      <td data-l="التعثر">${s.friction.v === 'often' ? 'كثيرًا' : s.friction.v === 'sometimes' ? 'أحيانًا' : '—'}</td></tr>`)
    for (const d of task.decisions.filter((x) => x.after === s.id)) {
      const back = task.stages.find((x) => x.id === d.back)
      rows.push(`<tr class="pr-dec"><td></td><td colspan="5">◇ ${esc(d.q)}${back ? ` وإلا رجعت إلى «${esc(back.name)}»` : d.out ? ` وإلا: ${esc(d.out)}` : ''}</td></tr>`)
    }
  })
  const date = new Intl.DateTimeFormat('ar-SA-u-nu-arab-ca-gregory', { dateStyle: 'long' }).format(new Date())
  return `<div class="pr">
    <div class="pr-head">${logo()}<div class="meta">${ctx.org ? esc(ctx.org) + ' · ' : ''}${date}</div></div>
    <h1>${esc(task.title)}</h1>
    <p class="sub">خريطة المهمة كما رسمتها الإدارة، مرحلةً مرحلة.</p>
    <div class="nums">
      <div><b>${hr ? `${n(hr[0])}–${n(hr[1])}` : '—'}</b><span>ساعة عمل في الشهر</span></div>
      <div><b>${N.workHours ? `نحو ${n(Math.max(1, Math.round(N.workHours)))}` : '—'}</b><span>ساعة عمل للمرة الواحدة</span></div>
      <div><b>${n(H.list.length)}</b><span>موضع انتقال بين الأيدي</span></div>
    </div>
    <table><thead><tr><th></th><th>المرحلة</th><th>من يتولاها</th><th>الوسيلة</th><th>العمل الفعلي</th><th>التعثر</th></tr></thead><tbody>${rows.join('')}</tbody></table>
    <p class="foot">الأرقام تقديرات مبنية على إجابات الإدارة، وتفصيلها في الجلسة. · إذكاء</p>
  </div>`
}
