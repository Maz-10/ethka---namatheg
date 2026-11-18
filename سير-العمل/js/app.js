// ═══ صفحة رسم سير العمل — الواجهة ═══
// كلُّ شاشةٍ دالّةٌ تُرجع نصَّ HTML من الحالة، وكلُّ لمسةٍ تمرّ بـ`update()` فتُحفظ وتُزامَن ويُعاد الرسم.
// الأفعالُ تُعلَّق على `data-a` وتُفضّ من موضعٍ واحد (`ACTIONS`)؛ والحقولُ النصّية على `data-in`.

import * as D from './data.js'
import * as C from './calc.js'
import * as R from './render.js'
import * as S from './sync.js'
import { applyClarification } from './arrange.js'
import { mountDust } from './welcome-dust.js'
import {
  state, update, undo, canUndo, onChange, onSynced, curTask, roleOf, allRoles, ORG, setOrg, hydrate,
  makeStage, taskFromTemplate, blankTask, cloneTask, newId, resetAll, extraTemplates, allTemplates,
} from './store.js'

const { esc, n, chip, unk, shape, icon, count, NOUN, byId, isUnknown } = R
const $ = (s, el = document) => el.querySelector(s)
const ORD = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة']
const ARRANGE_TIMEOUT = 20000
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

const ui = {
  sheet: null, search: '', toast: null, example: false, drag: null,
  focusName: false, docPick: null, journey: null, roleDraft: null, confirmReset: false,
  caps: { arrange: false, transcribe: false }, recording: null,
  shareLink: null, shareMsg: '',
}
const ctx = () => ({ roleOf, primary: true, selected: ui.sheet, grown: ui.grown, customRoles: state.roles, org: ORG })

// ── الترويسة: «الخطوة الثالثة من خمس»
const STEP_OF = { pick: 1, map: 2, props: 3, task: 4, reflect: 5 }

function header() {
  const step = STEP_OF[state.screen]
  const t = curTask()
  const dots = step ? `<span class="dots" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<i class="${i < step ? 'done' : i === step ? 'now' : ''}"></i>`).join('')}</span>` : ''
  const where = t && step > 1 ? t.title : ORG
  return `<header class="top">
    ${R.logo()}
    ${where ? `<span class="org">${esc(where)}</span>` : ''}
    <span class="sp"></span>
    ${step ? `<span class="steps">${dots}<span>الخطوة ${ORD[step - 1]} من خمس</span></span>` : ''}
    ${state.screen !== 'welcome' ? `<button class="icon-btn" data-a="undo" ${canUndo() ? '' : 'disabled'} aria-label="تراجع عن آخر تغيير">${icon('undo', 18)}<span class="hide-sm">تراجع</span></button>` : ''}
  </header>`
}

// ════════════ الشاشات ════════════

const STEPS = [
  { shape: 'list', title: 'تختار المهمة', text: 'من مهام الإدارة القانونية الشائعة، أو مهمة أخرى تبنيها بنفسك' },
  { shape: 'path', title: 'تصحح مراحلها وخصائصها', text: 'بلمسات: هل تمرّون بها، ومن يتولاها، وكم تأخذ' },
  { shape: 'ledger', title: 'ترى خريطتها وأرقامها', text: 'في ملف أنيق قابل للطباعة، يبقى عندك وعندنا' },
]

function welcome() {
  const resume = state.tasks.length > 0
  return `<section class="hello" aria-labelledby="hello-title">
    <div class="hello-ground" aria-hidden="true"></div>
    <div class="hello-stage">
      <canvas class="dust" aria-hidden="true"></canvas>
      <p class="hello-eyebrow">${R.logo('mark', 'mk')}إذكاء · رسم سير العمل</p>
      <h1 id="hello-title" class="hello-title">أهلًا بفريق الإدارة القانونية${ORG ? `<span class="hello-org">في ${esc(ORG)}</span>` : ''}</h1>
      <p class="hello-promise">أعدّ فريق إذكاء هذه الصفحة لإدارتكم خاصة. ترسم فيها مهمة واحدة من عملكم مرحلةً مرحلة، كما تجري عندكم فعلًا لا كما ينبغي أن تجري، ونفهم نحن منها عملكم قبل أن نقترح شيئًا.</p>
    </div>
    <ol class="hello-steps" aria-label="كيف تجري التجربة">
      ${STEPS.map((x, i) => `<li tabindex="0" data-step="${i}" data-shape="${x.shape}"><span class="n">${n(i + 1)}</span><b>${x.title}</b><span class="t">${x.text}</span><i class="run" aria-hidden="true"></i></li>`).join('')}
    </ol>
    <div class="hello-cta">
      <button class="btn gold" data-a="start" data-magnet>${resume ? 'أكمل من حيث توقفت' : 'ابدأ'}</button>
      <button class="btn ghost" data-a="example">شاهد مثالًا</button>
      ${resume && !ui.confirmReset ? `<button class="btn link" data-a="restart">ابدأ من جديد</button>` : ''}
    </div>
    ${ui.confirmReset ? `<div class="confirm hello-confirm" role="alert"><p>تُمحى الخرائط المحفوظة في هذا الجهاز، ولا يمكن استرجاعها.</p>
      <div class="actions"><button class="btn ghost" data-a="restart-yes">امحُ الخرائط وابدأ من جديد</button><button class="btn link" data-a="restart-no">أبقِها</button></div></div>` : ''}
    <ul class="hello-facts">
      <li><b>نحو عشر دقائق</b>للمهمة الواحدة، ويُحفظ ما تدخله أولًا بأول</li>
      <li><b>وصف الإجراء</b>لا تفاصيل القضايا، فلا أسماء ولا أرقام قضايا ولا خصوم</li>
      <li><b>داخل المملكة</b>تُحفظ إجاباتك، ولا يطّلع عليها إلا فريق إذكاء</li>
      <li><b>«لا أعرف»</b>جواب مقبول في كل سؤال، ولا شيء نهائي حتى تقول: اكتملت</li>
    </ul>
  </section>`
}

// ── حياةُ الترحيب: الغبار، والخطوات التي تعيد تشكيله، والزرُّ الذي يميل نحو المؤشّر
let hello = null
function mountHello() {
  if (hello) { hello.destroy(); hello = null }
  const canvas = $('.hello .dust')
  if (!canvas) return
  const dust = mountDust(canvas)
  const steps = [...document.querySelectorAll('.hello-steps li')]
  let idx = -1, timer = 0, paused = false
  const show = (i) => {
    idx = i
    steps.forEach((el, k) => el.classList.toggle('on', k === i))
    dust.set(i < 0 ? 'diamond' : steps[i].dataset.shape)
  }
  // يمضي وحده: المعيّن، ثم الخطوات واحدةً بعد أخرى، ثم يعود — ويتوقف ما دام العميل يشير إلى خطوة
  const tick = () => { if (!paused) show(idx >= steps.length - 1 ? -1 : idx + 1) }
  const reducedM = reduced()
  if (!reducedM) timer = setInterval(tick, 3600)
  const enter = (e) => { paused = true; show(Number(e.currentTarget.dataset.step)) }
  const leave = () => { paused = false }
  steps.forEach((el) => {
    el.addEventListener('pointerenter', enter); el.addEventListener('focus', enter)
    el.addEventListener('pointerleave', leave); el.addEventListener('blur', leave)
  })
  // الزرُّ المغناطيسي — للفأرة وحدها ولمن لم يطلب تقليل الحركة (`site/src/motion/pointer.ts`)
  const mag = $('[data-magnet]')
  let magMove = null
  if (mag && !reducedM && matchMedia('(pointer: fine)').matches) {
    const box = mag.parentElement
    magMove = (e) => {
      const r = mag.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
      const far = Math.abs(dx) > r.width / 2 + 26 || Math.abs(dy) > r.height / 2 + 26
      mag.style.transform = far ? '' : `translate(${Math.max(-7, Math.min(7, dx * 0.22)).toFixed(1)}px,${Math.max(-7, Math.min(7, dy * 0.22)).toFixed(1)}px)`
    }
    box.addEventListener('pointermove', magMove)
    box.addEventListener('pointerleave', () => (mag.style.transform = ''))
  }
  hello = { destroy() { clearInterval(timer); dust.destroy() } }
}

function pick() {
  const q = ui.search.trim()
  const legal = allTemplates().filter((t) => t.dept === 'legal')
  const list = q ? legal.filter((t) => (t.title + ' ' + t.sub + ' ' + (t.keywords || '')).includes(q)) : legal
  const prev = state.tasks.filter((t) => t.completed)
  return `<section class="page">
    <h1>أي مهمة تُتعبكم أكثر؟</h1>
    <p class="lead">ابدأ بها، فهي أوضح ما يُرسم وأنفع ما يُدرس.</p>
    <div class="q">
      <label class="ql" for="search">ابحث بكلمة، أو اختر من القائمة</label>
      <input id="search" class="input" type="search" data-in="search" value="${esc(ui.search)}" placeholder="مثل: عقد، وكالة، اعتراض" autocomplete="off">
    </div>
    <ul class="tpl-list" role="list">
      ${list.map((t) => `<li><button class="tpl" data-a="tpl:${t.id}"><span class="tx"><b>${esc(t.title)}</b><span>${esc(t.sub)}</span></span>${icon('forward', 18)}</button></li>`).join('')}
      ${q && !list.length ? `<li class="empty">لا مهمة بهذه الكلمة في القائمة. اختر «مهمة أخرى» وابنِها بنفسك.</li>` : ''}
      <li><button class="tpl other" data-a="other"><span class="tx"><b>مهمة أخرى</b><span>ليست في القائمة؟ ابنِها مرحلةً مرحلة</span></span>${icon('forward', 18)}</button></li>
    </ul>
    ${prev.length ? `<div class="q"><span class="ql">أو ابدأ من خريطة رسمتها</span><div class="chips">${prev.map((t) => chip('clone:' + t.id, esc(t.title), false)).join('')}</div><p class="hint">إن تشابهت المهمتان فتعديل الخريطة أسرع من رسمها من جديد.</p></div>` : ''}
  </section>`
}

function voiceControls(target) {
  if (!ui.caps.transcribe || !S.online() || !window.MediaRecorder) return ''
  const rec = ui.recording && ui.recording.target === target
  return `<div class="voice">${rec
    ? `<button class="btn ghost rec" data-a="rec-stop">${icon('stop', 18)}أوقف التسجيل <span class="timer" id="rec-timer">٠:٠٠</span></button>`
    : `<button class="btn ghost" data-a="rec:${target}">${icon('mic', 18)}سجّل بصوتك</button>`}
    <span class="small muted">حتى دقيقة واحدة</span></div>`
}

function mapScreen() {
  const t = curTask()
  const pending = t.stages.filter((s) => s.status === 'pending').length
  const banner = {
    template: 'هكذا تجري هذه المهمة في كثير من الجهات، فهل هكذا عندكم؟',
    arranged: 'رتّبنا كلامك هكذا، فصحِّح ما لم نُصِب فيه.',
    'story-fallback': 'حفظنا حكايتك كما كتبتها، وهذه أقرب مسودة إلى ما وصفت. صحّح ما يخالف عملك.',
    'story-guide': 'حفظنا حكايتك كما كتبتها. ابنِ المراحل من هنا وحكايتك أمامك.',
    clone: 'بدأنا من خريطتك السابقة، فعدّل ما يختلف في هذه المهمة.',
  }[t.source] || 'ابدأ من هذه المراحل الثلاث: سمِّ كل مرحلة بلفظ جهتك، وأضف ما بينها.'
  return `<section class="page wide">
    <div class="canvas-head">
      <h1 class="banner">${banner}</h1>
      ${t.source === 'blank' ? `<label class="ql title-l" for="task-title">اسم المهمة <span class="muted">اختياري</span></label><input id="task-title" class="input" data-in="title" value="${esc(t.title === 'مهمة أخرى' ? '' : t.title)}" placeholder="مثل: الرد على التظلمات">` : ''}
      ${t.story ? `<details class="story-box"><summary>${t.source === 'arranged' ? 'النص كما فهمناه' : 'حكايتك كما كتبتها'}</summary><p>${esc(t.story)}</p></details>` : ''}
      <p class="rule-line">المرحلة الواحدة: ما يُنجَز دون أن ينتقل الملف إلى يد أخرى أو ينتظر.</p>
      <p class="help">المس أي مرحلة لتعديلها، واسحبها من مقبضها لتغيير ترتيبها، وأضف بين أي مرحلتين بعلامة +.</p>
      ${t.source === 'arranged' ? `<p class="help">القيمة ذات النقطة استنتجناها من كلامك، والمس المرحلة لترى شاهدها. والباهتة مقترحة تنتظر تأكيدك.</p>` : ''}
    </div>
    ${R.trackHTML(t, 'map', ctx())}
    ${missingHint(t)}
  </section>
  <div class="bar"><div class="in">
    <span class="note">${pending ? `بقيت ${count(pending, NOUN.stages)} دون جواب` : 'المراحل جاهزة'}</span>
    <button class="btn primary" data-a="to-props">${pending ? 'هكذا عندنا، تابع' : 'تابع إلى الخصائص'}</button>
  </div></div>`
}

function missingHint(t) {
  if (t.stages.some((s) => s.status === 'pending')) return ''
  const act = C.activeStages(t)
  if (act.length < 3) return ''
  const names = act.map((s) => s.name).join(' ')
  const dismissed = t.dismissed || []
  const i = D.MISSING_HINTS.findIndex((h, k) => !dismissed.includes(k) && !h.has.test(names))
  if (i < 0) return ''
  return `<div class="suggest" role="note"><p>${esc(D.MISSING_HINTS[i].ask)}</p>
    <button class="btn ghost" data-a="hint-add:${i}">نعم، أضفها</button>
    <button class="btn link" data-a="hint-no:${i}">لا</button></div>`
}

const stageDone = (s) => s.actor.v && s.work.v && s.friction.v && s.actor.src !== 'suggested'

function propsScreen() {
  const t = curTask()
  const act = C.activeStages(t)
  const done = act.filter(stageDone).length
  return `<section class="page wide">
    <div class="canvas-head">
      <h1 class="banner">لكل مرحلة: من يتولاها، وكيف تُنجز، وكم تأخذ.</h1>
      <p class="help">نحو عشرين ثانية لكل مرحلة، وكلها باللمس. «التالية» تنقلك إلى ما بعدها.</p>
      ${R.legend(t, ctx())}
    </div>
    ${R.trackHTML(t, 'props', ctx())}
  </section>
  <div class="bar"><div class="in">
    <span class="note">اكتملت ${n(done)} من ${count(act.length, NOUN.stagesAcc)}</span>
    ${done === 0 ? `<button class="btn primary" data-a="walk">ابدأ بالمرحلة الأولى</button>` : `<button class="btn primary" data-a="to-task">تابع إلى أسئلة المهمة</button>`}
  </div></div>`
}

// ── لوحة الخصائص
function evidence(p) {
  if (!p || !p.ev || !(p.src === 'stated' || p.src === 'inferred')) return ''
  return `<p class="evidence"><span>${p.src === 'stated' ? 'من كلامك' : 'استنتجناه من قولك'}:</span> «${esc(p.ev)}»</p>`
}

function sheetHTML() {
  const t = curTask()
  if (!t || !ui.sheet) return ''
  if (ui.sheet.startsWith('d')) return decSheet(t, t.decisions.find((d) => d.id === ui.sheet))
  const s = t.stages.find((x) => x.id === ui.sheet)
  if (!s) return ''
  const act = C.activeStages(t)
  const idx = act.findIndex((x) => x.id === s.id)
  const isLast = idx === act.length - 1
  const fr = s.friction.v
  const id = s.id
  const sug = (p, on) => (on && p.src === 'suggested' ? 'suggested' : on && p.src === 'inferred' ? 'inferred' : '')
  const pressed = (p, on) => on && p.src !== 'suggested'
  const sing = (field, list) => list.map((o) => {
    const on = s[field].v === o.id
    return chip(`set:${id}:${field}:${o.id}`, o.label, pressed(s[field], on), sug(s[field], on))
  }).join('') + unk(`set:${id}:${field}:${D.UNKNOWN}`, isUnknown(s[field].v))
  return `<div class="handle" aria-hidden="true"></div>
  <div class="s-head"><span>${idx >= 0 ? `المرحلة ${n(idx + 1)} من ${n(act.length)}` : ''}</span><span class="sp"></span><button class="icon-btn" data-a="close" aria-label="أغلق اللوحة">${icon('close', 18)}</button></div>
  <label class="sr" for="stage-name">اسم المرحلة</label>
  <input id="stage-name" class="name-in" data-in="name:${id}" value="${esc(s.guide ? '' : s.name)}" placeholder="${esc(s.guide ? s.name : 'اسم المرحلة بلفظ جهتك')}">
  ${s.summary ? `<p class="evidence"><span>كما وصفتها:</span> ${esc(s.summary)}</p>` : ''}
  ${s.status === 'pending' || s.status === 'sometimes' || t.source === 'template' ? `<div class="q"><span class="ql">هل تمرّون بها؟</span><div class="chips">
    ${chip(`st-yes:${id}`, 'نعم', s.status === 'yes')}${chip(`st-no:${id}`, 'لا', false)}${chip(`st-some:${id}`, 'أحيانًا', s.status === 'sometimes')}</div></div>` : ''}
  ${s.status === 'sometimes' ? `<div class="q"><label class="ql" for="cond">متى تحدث؟</label><input id="cond" class="input" data-in="cond:${id}" value="${esc(s.condition)}" placeholder="مثل: إذا كانت القضية عمالية"></div>` : ''}

  <div class="q"><div class="ql"><span>من يتولى هذه المرحلة؟</span>${s.actor.v && !isUnknown(s.actor.v) && !isLast ? `<button class="apply" data-a="apply:${id}:actor">طبّقه على المراحل التالية</button>` : ''}</div>
    ${evidence(s.actor)}
    <div class="chips">${allRoles().map((r) => { const on = s.actor.v === r.id; return chip(`set:${id}:actor:${r.id}`, `${shape(r)}${esc(r.label)}`, pressed(s.actor, on), sug(s.actor, on)) }).join('')}
    ${unk(`set:${id}:actor:${D.UNKNOWN}`, isUnknown(s.actor.v))}
    <button type="button" class="chip add" data-a="role-new">${icon('plus', 16)}دور آخر</button></div>
    ${ui.roleDraft != null ? `<div class="inline-add"><input class="input" data-in="role" value="${esc(ui.roleDraft)}" placeholder="اسم الدور، لا اسم الشخص" aria-label="اسم الدور"><button class="btn ghost" data-a="role-save:${id}">أضفه</button></div>` : ''}
  </div>

  <div class="q"><div class="ql"><span>كيف تُنجَز؟ <span class="muted">اختر ما ينطبق</span></span>${s.channels.v.length && !isLast ? `<button class="apply" data-a="apply:${id}:channels">طبّقه على المراحل التالية</button>` : ''}</div>
    ${evidence(s.channels)}
    <div class="chips">${D.CHANNELS.map((c) => { const on = s.channels.v.includes(c.id); return chip(`tog:${id}:channels:${c.id}`, c.label, pressed(s.channels, on), sug(s.channels, on)) }).join('')}${unk(`tog:${id}:channels:${D.UNKNOWN}`, s.channels.v.includes(D.UNKNOWN))}</div>
  </div>

  <div class="q"><span class="ql">كم تستغرق من عمل فعلي؟</span>${evidence(s.work)}<div class="chips">${sing('work', D.WORK)}</div></div>

  <div class="q"><span class="ql">هل تتعطل المهمة هنا؟</span>${evidence(s.friction)}<div class="chips">${sing('friction', D.FRICTION)}</div></div>
  ${fr === 'sometimes' || fr === 'often' ? `<div class="q"><span class="ql">ما الذي يعطّلها غالبًا؟</span><div class="chips">${D.REASONS.map((r) => chip(`tog:${id}:reasons:${r.id}`, r.label, s.friction.reasons.includes(r.id))).join('')}${unk(`tog:${id}:reasons:${D.UNKNOWN}`, s.friction.reasons.includes(D.UNKNOWN))}</div></div>` : ''}

  <details ${s.docsIn.length || s.docsOut.length || s.constraints.length || s.note ? 'open' : ''}>
    <summary>تفاصيل أكثر <span class="muted">اختيارية</span></summary>
    <div class="q"><span class="ql">ما الذي يدخل هذه المرحلة؟</span><div class="chips">${docChips(id, 'docsIn', s.docsIn)}</div></div>
    <div class="q"><span class="ql">وما الذي يخرج منها؟</span><div class="chips">${docChips(id, 'docsOut', s.docsOut)}</div></div>
    ${ui.docPick && ui.docPick.sid === id ? `<div class="inline-add"><input class="input" data-in="doc" value="${esc(ui.docPick.text)}" placeholder="اسم المستند" aria-label="اسم المستند"><button class="btn ghost" data-a="doc-save">أضفه</button></div>` : ''}
    <div class="q"><span class="ql">هل في هذه المرحلة ما لا يمكن تغييره؟</span><div class="chips">${D.CONSTRAINTS.map((c) => chip(`tog:${id}:constraints:${c.id}`, c.label, s.constraints.includes(c.id))).join('')}${unk(`tog:${id}:constraints:${D.UNKNOWN}`, s.constraints.includes(D.UNKNOWN))}</div></div>
    <div class="q"><label class="ql" for="note">هل تضيف شيئًا؟</label><textarea id="note" class="textarea short" data-in="note:${id}">${esc(s.note)}</textarea>${voiceControls('note:' + id)}</div>
  </details>

  <div class="tools">
    <button class="icon-btn" data-a="move:${id}:-1" ${idx <= 0 ? 'disabled' : ''}>قدّمها</button>
    <button class="icon-btn" data-a="move:${id}:1" ${isLast ? 'disabled' : ''}>أخّرها</button>
    <button class="icon-btn" data-a="merge:${id}" ${isLast ? 'disabled' : ''}>ادمجها مع التالية</button>
    <button class="icon-btn" data-a="dec-add:${id}">أضف نقطة قرار بعدها</button>
    ${S.online() ? `<button class="icon-btn" data-a="share-stage:${id}">أرسلها إلى زميل يعرفها</button>` : ''}
    <button class="icon-btn danger" data-a="del:${id}">احذفها</button>
  </div>
  ${ui.shareLink && ui.shareLink.stage === id ? shareBox() : ''}
  <div class="nav">
    ${idx > 0 ? `<button class="btn ghost" data-a="go:${act[idx - 1].id}">السابقة</button>` : ''}
    ${isLast ? `<button class="btn primary" data-a="close">انتهت المراحل</button>` : `<button class="btn primary" data-a="go:${act[idx + 1]?.id}">التالية</button>`}
  </div>`
}

function docChips(id, field, list) {
  const t = curTask()
  let suggest = []
  if (field === 'docsIn') { // ما يخرج من مرحلةٍ يُقترح مدخلًا للتي تليها
    const act = C.activeStages(t); const i = act.findIndex((s) => s.id === id)
    if (i > 0) suggest = act[i - 1].docsOut.filter((d) => !list.includes(d))
  }
  const lib = [...new Set([...D.DOCUMENTS, ...list, ...suggest])]
  return lib.map((d) => chip(`doc:${id}:${field}:${d}`, esc(d), list.includes(d), suggest.includes(d) ? 'suggested' : '')).join('') +
    `<button type="button" class="chip add" data-a="doc-new:${id}:${field}">${icon('plus', 16)}مستند آخر</button>`
}

function decSheet(t, d) {
  if (!d) return ''
  const act = C.activeStages(t)
  const options = act.slice(0, act.findIndex((s) => s.id === d.after) + 1)
  return `<div class="handle" aria-hidden="true"></div>
  <div class="s-head"><span>نقطة قرار</span><span class="sp"></span><button class="icon-btn" data-a="close" aria-label="أغلق اللوحة">${icon('close', 18)}</button></div>
  <div class="q"><label class="ql" for="dq">السؤال</label><input id="dq" class="input" data-in="dq:${d.id}" value="${esc(d.q)}" placeholder="مثل: تُعتمد، أم تُعاد للتعديل؟">${d.ev ? `<p class="evidence"><span>من كلامك:</span> «${esc(d.ev)}»</p>` : ''}</div>
  <div class="q"><span class="ql">إن لم يُقبل، إلى أين ترجع المهمة؟</span><div class="chips">
    ${options.map((s) => chip(`dec-back:${d.id}:${s.id}`, esc(s.name), d.back === s.id)).join('')}
    ${chip(`dec-back:${d.id}:`, 'تخرج من المسار', !d.back)}</div></div>
  ${!d.back ? `<div class="q"><label class="ql" for="dout">ماذا يحدث عندئذ؟</label><input id="dout" class="input" data-in="dout:${d.id}" value="${esc(d.out)}" placeholder="مثل: يُقفل الملف"></div>` : ''}
  <div class="q"><span class="ql">كم يتكرر هذا الرجوع؟</span><div class="chips">
    ${chip(`dec-c:${d.id}:common`, 'كثيرًا', d.common === 'common')}${chip(`dec-c:${d.id}:rare`, 'نادرًا', d.common === 'rare')}${unk(`dec-c:${d.id}:${D.UNKNOWN}`, isUnknown(d.common))}</div></div>
  <div class="tools"><button class="icon-btn danger" data-a="dec-del:${d.id}">احذف نقطة القرار</button></div>
  <div class="nav"><button class="btn primary" data-a="close">تم</button></div>`
}

// ── أسئلة المهمة الكلية
function taskScreen() {
  const g = curTask().global
  const one = (field, list) => list.map((o) => chip(`g:${field}:${o.id}`, o.label, g[field] === o.id)).join('') + unk(`g:${field}:${D.UNKNOWN}`, isUnknown(g[field]))
  return `<section class="page">
    <h1>ثلاثة أسئلة عن المهمة كلها</h1>
    <div class="q"><span class="ql">كم مرة تمر بكم هذه المهمة في الشهر تقريبًا؟</span>
      <div class="chips">${one('freq', D.FREQUENCY)}${chip('g:freq:custom', 'سأكتب العدد', g.freq === 'custom')}</div>
      ${g.freq === 'custom' || g.freq === 'gt100' ? `<label class="sr" for="freqNum">العدد في الشهر</label><input id="freqNum" class="input narrow" inputmode="numeric" data-in="freqNum" value="${esc(g.freqNum)}" placeholder="العدد في الشهر">` : ''}
      <details class="more"><summary>سؤالان إضافيان، ولك أن تتركهما</summary>
        <div class="q"><span class="ql">هل هي ثابتة على مدار السنة، أم تشتد في أوقات معينة؟</span><div class="chips">
          ${chip('g:seasonal:steady', 'ثابتة', g.seasonal === 'steady')}${chip('g:seasonal:peaks', 'تشتد في أوقات', g.seasonal === 'peaks')}${unk('g:seasonal:unknown', isUnknown(g.seasonal))}</div>
          ${g.seasonal === 'peaks' ? `<label class="sr" for="when">متى تشتد؟</label><input id="when" class="input" data-in="seasonWhen" value="${esc(g.seasonWhen)}" placeholder="متى؟ مثل: آخر السنة المالية">` : ''}</div>
        <div class="q"><label class="ql" for="team">كم شخصًا يعمل عليها في الإدارة؟</label><input id="team" class="input narrow" inputmode="numeric" data-in="team" value="${esc(g.team)}"></div>
      </details>
    </div>
    <hr class="rule">
    <div class="q"><span class="ql">كيف تصلكم هذه المهمة عادةً؟ <span class="muted">اختر ما ينطبق</span></span>
      <div class="chips">${D.ENTRY.map((e) => chip(`gt:entry:${e.id}`, e.label, g.entry.includes(e.id))).join('')}${unk(`gt:entry:${D.UNKNOWN}`, g.entry.includes(D.UNKNOWN))}</div></div>
    <div class="q"><span class="ql">ومن يرسلها غالبًا؟</span>
      <div class="chips">${allRoles().map((r) => chip(`g:sender:${r.id}`, `${shape(r)}${esc(r.label)}`, g.sender === r.id)).join('')}${unk(`g:sender:${D.UNKNOWN}`, isUnknown(g.sender))}</div></div>
    <hr class="rule">
    <div class="q"><span class="ql">متى تعدّون المهمة منتهية؟</span><div class="chips">${one('exit', D.EXIT)}</div>
      ${g.exit === 'other' ? `<label class="sr" for="exitOther">متى تنتهي المهمة؟</label><input id="exitOther" class="input" data-in="exitOther" value="${esc(g.exitOther)}" placeholder="اكتبها باختصار">` : ''}</div>
    <div class="q"><span class="ql">وأين يُحفظ أثرها بعد الانتهاء؟</span><div class="chips">${one('storage', D.STORAGE)}</div></div>
    <hr class="rule">
    <div class="q"><span class="ql">هل على هذه المهمة اشتراطات سرية أو صلاحيات اطلاع خاصة؟</span><div class="chips">
      ${chip('g:secret:yes', 'نعم', g.secret === 'yes')}${chip('g:secret:no', 'لا', g.secret === 'no')}${unk(`g:secret:${D.UNKNOWN}`, isUnknown(g.secret))}</div></div>
  </section>
  <div class="bar"><div class="in"><button class="btn ghost" data-a="back:props">رجوع</button><button class="btn primary" data-a="to-reflect">اعرض الخريطة وأرقامها</button></div></div>`
}

// ── الانعكاس
function crossTasks() {
  const done = state.tasks.filter((t) => t.completed || t.id === state.cur)
  if (done.length < 2) return ''
  const tally = new Map()
  for (const t of done) for (const r of new Set(C.activeStages(t).map((s) => s.actor.v).filter((v) => v && !isUnknown(v)))) tally.set(r, (tally.get(r) || 0) + 1)
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!top || top[1] < 2) return ''
  return `<p class="aside-note">يتكرر دور «${esc(roleOf(top[0])?.label)}» في ${n(top[1])} من المهام التي رسمتها، وعددها ${n(done.length)}.</p>`
}

function reflectScreen() {
  const t = curTask()
  const act = C.activeStages(t)
  const unknowns = act.filter((s) => [s.actor.v, s.work.v, s.friction.v].some(isUnknown))
  const docs = [...new Set(act.flatMap((s) => [...s.docsIn, ...s.docsOut]))]
  const doc = ui.journey && docs.includes(ui.journey) ? ui.journey : docs[0]
  return `<section class="page wide">
    <div class="reflect-head">
      <h1>هذه مهمتك كما رسمتها</h1>
      ${R.legend(t, ctx())}
    </div>
    ${R.trackHTML(t, 'reflect', ctx())}
    <div class="reflect-head">
      <h2 class="sec">أرقامها</h2>
      ${R.numbersHTML(t, ctx())}
      ${crossTasks()}
      ${unknowns.length ? `<p class="aside-note">أجبت «لا أعرف» في ${unknowns.map((s) => '«' + esc(s.name) + '»').join(' و')}. يمكنك أن تسأل عنها زميلًا ثم تعود إليها.</p>` : ''}
    </div>
    <div class="deep">
      <details><summary>رحلة المستند</summary>
        ${docs.length ? `<div class="chips">${docs.map((d) => chip('journey:' + d, esc(d), d === doc)).join('')}</div>${journeyHTML(t, doc)}`
          : '<p class="small muted">لم تحدد مستندات للمراحل. يمكنك إضافتها من «تفاصيل أكثر» في لوحة كل مرحلة.</p>'}
      </details>
      <details><summary>الأنظمة والأدوات التي تستخدمونها اليوم</summary>
        <div class="q"><label class="sr" for="systems">الأنظمة والأدوات</label><textarea id="systems" class="textarea short" data-in="systems" placeholder="مثل: نظام الاتصالات الإدارية، ومجلد مشترك، وناجز">${esc(t.systems)}</textarea></div>
      </details>
    </div>
  </section>
  <div class="bar"><div class="in"><button class="btn ghost" data-a="back:task">رجوع</button><button class="btn primary" data-a="finish">اكتملت المهمة</button></div></div>`
}

function journeyHTML(t, doc) {
  if (!doc) return ''
  const path = C.activeStages(t).filter((s) => s.docsIn.includes(doc) || s.docsOut.includes(doc))
  if (!path.length) return ''
  const hands = new Set(path.map((s) => s.actor.v).filter((v) => v && !isUnknown(v)))
  return `<ol class="journey">${path.map((s) => `<li>${shape(roleOf(s.actor.v))}${esc(s.name)}</li>`).join('')}</ol>
    <p class="small muted">يمر «${esc(doc)}» بـ${count(path.length, NOUN.stagesAcc)}${hands.size > 1 ? `، وينتقل بين ${count(hands.size, NOUN.hands)}` : ''}.</p>`
}

function shareBox() {
  return `<div class="share-box" role="status"><p>${esc(ui.shareMsg)}</p>
    <input class="input" readonly value="${esc(ui.shareLink.url)}" aria-label="رابط الزميل" dir="ltr" data-select>
    <div class="actions"><button class="btn ghost" data-a="share-copy">انسخ الرابط</button>${navigator.share ? `<button class="btn link" data-a="share-native">شاركه</button>` : ''}</div></div>`
}

function finalScreen() {
  const t = curTask()
  return `<section class="page done">
    <h1>شكرًا لك. وصلتنا خريطة «${esc(t.title)}»</h1>
    <div class="actions">
      <button class="btn primary" data-a="print">${icon('print', 18)}نزّل الخريطة</button>
      <button class="btn ghost" data-a="another">${icon('add', 18)}أضف مهمة أخرى</button>
    </div>
    <div class="paper" aria-label="الخريطة كما تُطبع">${R.printHTML(t, ctx())}</div>
  </section>`
}

// ── المثال المكتمل: جهة افتراضية
function exampleTask() {
  const t = taskFromTemplate('lawsuit-against')
  const fill = [
    ['assistant', ['gov'], 'lt1', 'none', 'none'], ['assistant', ['sheet', 'email'], 'lt1', 'hours', 'none'],
    ['lawyer', ['email'], 'lt1', 'gtweek', 'often', ['docs']], ['lawyer', [], 'day', 'hours', 'none'],
    ['head', ['email'], 'lt1', '1to3', 'sometimes', ['approval']], ['lawyer', [], 'day', '1to3', 'none'],
    ['head', ['paper'], '1to3', '1to3', 'often', ['approval']], ['lawyer', ['gov'], 'half', 'week', 'none'],
    ['lawyer', ['gov'], '1to3', 'week', 'none'], ['head', ['email'], '1to3', '1to3', 'none'],
  ]
  t.stages.forEach((s, i) => {
    const [a, ch, w, wt, f, rs] = fill[i]
    Object.assign(s, { status: 'yes', actor: { v: a, src: 'user' }, channels: { v: ch, src: 'user' }, work: { v: w }, wait: { v: wt }, friction: { v: f, reasons: rs || [] } })
  })
  t.stages[5].docsOut = ['مذكرة جوابية']; t.stages[6].docsIn = ['مذكرة جوابية']
  t.decisions[0].common = 'common'
  t.global = { ...t.global, freq: '5to20', entry: ['gov'], exit: 'closed', storage: 'shared' }
  return t
}

function exampleView() {
  const t = exampleTask()
  const c = { roleOf, primary: false, customRoles: [] }
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="ex-h">
    <header class="top">${R.logo()}<span class="org">مثال لجهة افتراضية</span><span class="sp"></span><button class="icon-btn" data-a="close-ex">${icon('close', 18)}<span>أغلق المثال</span></button></header>
    <main><section class="page wide">
      <div class="canvas-head"><h1 id="ex-h" class="banner">دعوى مقامة على الجهة، كما رسمتها إدارة افتراضية</h1>
      <p class="help">الشكل الملون بجانب المنفّذ يدل على من يتولاها، والفاصل بين البطاقات يطول بقدر الانتظار، والسهم المنحني رجوع إلى مرحلة سابقة.</p>${R.legend(t, c)}</div>
      ${R.trackHTML(t, 'view', c)}
      <div class="reflect-head">${R.numbersHTML(t, c)}
      <div class="actions"><button class="btn primary" data-a="close-ex-start">ابدأ مهمتك</button></div></div>
    </section></main></div>`
}

// ════════════ الرسم ════════════

const SCREENS = { welcome, pick, map: mapScreen, props: propsScreen, task: taskScreen, reflect: reflectScreen, final: finalScreen }

function render() {
  const sheetEl = $('#sheet')
  const sheetScroll = sheetEl.scrollTop
  const trackScroll = $('#track-wrap')?.scrollLeft
  const active = document.activeElement
  const activeKey = active?.dataset?.in || active?.dataset?.a
  const caret = active && 'selectionStart' in active ? active.selectionStart : null

  if (!curTask() && !['welcome', 'pick'].includes(state.screen)) state.screen = 'pick'
  if (!SCREENS[state.screen]) state.screen = curTask() ? 'map' : 'pick' // شاشاتٌ أُلغيت من نسخٍ سابقة
  $('#app').innerHTML = header() + `<main id="main">${SCREENS[state.screen]()}</main>`
  const t = curTask()
  $('#print').innerHTML = t && ['reflect', 'final'].includes(state.screen) ? R.printHTML(t, ctx()) : ''

  const open = !!ui.sheet && ['map', 'props'].includes(state.screen)
  sheetEl.innerHTML = open ? sheetHTML() : ''
  sheetEl.classList.toggle('on', open)
  sheetEl.toggleAttribute('inert', !open)
  $('#scrim').classList.toggle('on', open)
  $('#scrim').hidden = !open
  document.body.classList.toggle('sheet-open', open)
  if (open) sheetEl.scrollTop = sheetScroll

  $('#modal').innerHTML = ui.example ? exampleView() : ''
  $('#app').toggleAttribute('inert', ui.example)
  $('#toast').innerHTML = ui.toast ? `<div class="toast" role="status"><span>${esc(ui.toast.text)}</span>${ui.toast.undo ? '<button data-a="undo">تراجع</button>' : ''}</div>` : ''

  if (trackScroll != null && $('#track-wrap')) $('#track-wrap').scrollLeft = trackScroll
  if (activeKey) { // إعادةُ التركيز إلى الحقل نفسِه بعد الرسم
    const el = document.querySelector(`[data-in="${CSS.escape(activeKey)}"]`) || document.querySelector(`[data-a="${CSS.escape(activeKey)}"]`)
    if (el) { el.focus({ preventScroll: true }); if (caret != null && 'setSelectionRange' in el) try { el.setSelectionRange(caret, caret) } catch {} }
  }
  if (ui.focusName) { ui.focusName = false; const el = $('#stage-name'); el?.focus(); el?.select() }
  ui.grown = null
  requestAnimationFrame(R.drawArrows)
  if (state.screen === 'welcome' && !ui.example) mountHello()
  else if (hello) { hello.destroy(); hello = null }
}

function toast(text, undoable = false) {
  ui.toast = { text, undo: undoable }
  clearTimeout(toast.t)
  toast.t = setTimeout(() => { ui.toast = null; $('#toast').innerHTML = '' }, 5000)
  $('#toast').innerHTML = `<div class="toast" role="status"><span>${esc(text)}</span>${undoable ? '<button data-a="undo">تراجع</button>' : ''}</div>`
}

// ════════════ الأفعال ════════════

let lastScreen = null
function go(screen) {
  update((s) => { s.screen = screen }, { undoable: false })
  scrollTo(0, 0)
}
onChange(() => { if (state.screen !== lastScreen) { lastScreen = state.screen; S.event('step', { screen: state.screen }) } })
const stageOf = (t, id) => t.stages.find((s) => s.id === id)

function openStage(id) {
  ui.sheet = id; ui.roleDraft = null; ui.docPick = null; ui.shareLink = null
  render()
  const el = document.querySelector(`.card[data-sid="${id}"]`)
  if (el) el.scrollIntoView({ block: 'center', inline: 'center', behavior: reduced() ? 'auto' : 'smooth' })
}

function addStage(index) {
  const t = curTask()
  const st = makeStage('مرحلة جديدة')
  update(() => { t.stages.splice(index, 0, st) })
  ui.grown = st.id
  ui.focusName = true
  openStage(st.id)
}

function mergeNext(id) {
  const t = curTask()
  const act = C.activeStages(t)
  const i = act.findIndex((s) => s.id === id)
  const a = act[i]; const b = act[i + 1]
  if (!b) return
  update(() => {
    a.name = `${a.name}، ثم ${b.name}`
    a.channels.v = [...new Set([...a.channels.v, ...b.channels.v])]
    const wa = byId(D.WORK, a.work.v), wb = byId(D.WORK, b.work.v)
    if (wb && (!wa || wb.hours > wa.hours)) a.work = { ...b.work }
    const rank = { none: 0, sometimes: 1, often: 2 }
    if ((rank[b.friction.v] ?? -1) > (rank[a.friction.v] ?? -1)) a.friction = b.friction
    a.docsIn = [...new Set([...a.docsIn, ...b.docsIn])]; a.docsOut = [...new Set([...a.docsOut, ...b.docsOut])]
    a.constraints = [...new Set([...a.constraints, ...b.constraints])]
    for (const d of t.decisions) { if (d.after === b.id) d.after = a.id; if (d.back === b.id) d.back = a.id }
    t.stages.splice(t.stages.indexOf(b), 1)
  })
  toast('دُمجت المرحلتان', true)
}

function moveStage(id, dir) {
  const t = curTask()
  const i = t.stages.findIndex((s) => s.id === id)
  let j = i + dir
  while (t.stages[j] && t.stages[j].status === 'no') j += dir
  if (j < 0 || j >= t.stages.length) return
  update(() => { const [s] = t.stages.splice(i, 1); t.stages.splice(j, 0, s) })
}

function setStatus(id, v) {
  const s = stageOf(curTask(), id)
  update(() => { s.status = s.status === v && v !== 'no' ? 'pending' : v })
  if (v === 'no') toast(`طُويت «${s.name}»، ويمكنك استرجاعها`, true)
  if (v === 'sometimes' && ui.sheet !== id) openStage(id)
}

async function createShare(body) {
  try {
    const r = await S.share(body)
    const q = body.taskId ? `?مهمة=${encodeURIComponent(body.taskId)}${body.stageId ? `&مرحلة=${encodeURIComponent(body.stageId)}` : ''}` : ''
    return location.origin + '/r/' + r.token + q
  } catch { return null }
}

// ── التسجيل الصوتي: يظهر إن أتاح الخادم التفريغ، ولا يُحفظ المقطع بعد تفريغه
async function startRecording(target) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const rec = new MediaRecorder(stream)
    const chunks = []
    const limit = 60
    const started = Date.now()
    rec.ondataavailable = (e) => chunks.push(e.data)
    rec.onstop = async () => {
      stream.getTracks().forEach((x) => x.stop())
      clearInterval(ui.recording?.tick)
      ui.recording = null
      render()
      toast('نفرّغ تسجيلك…')
      try {
        const { text } = await S.transcribe(new Blob(chunks, { type: rec.mimeType }))
        appendText(target, text)
        toast('أضفنا تسجيلك إلى النص، فراجعه إن شئت.')
      } catch { toast('تعذّر تفريغ التسجيل هذه المرة. اكتب ما قلته، أو حاول مرة أخرى.') }
    }
    rec.start()
    ui.recording = {
      target, rec,
      tick: setInterval(() => {
        const sec = Math.floor((Date.now() - started) / 1000)
        const el = $('#rec-timer'); if (el) el.textContent = `${n(Math.floor(sec / 60))}:${n(sec % 60).padStart(2, '٠')}`
        if (sec >= limit) rec.stop()
      }, 500),
    }
    render()
  } catch { toast('لم نتمكن من الوصول إلى الميكروفون، فاكتب ما تريد قوله.') }
}

function appendText(target, text) {
  if (!text) return
  const t = curTask()
  const [k, id] = target.split(':')
  update(() => {
    if (k === 'note') { const s = stageOf(t, id); s.note = [s.note, text].filter(Boolean).join('\n') }
  })
}

const exclusive = (list, val) => list.includes(val) ? list.filter((x) => x !== val) : [...list.filter((x) => (val === D.UNKNOWN ? false : x !== D.UNKNOWN)), val]

const ACTIONS = {
  start() {
    S.event('start')
    if (state.tasks.length && state.cur) return go(state.screen === 'welcome' ? 'map' : state.screen)
    go('pick')
  },
  restart() { ui.confirmReset = true; render() },
  'restart-no'() { ui.confirmReset = false; render() },
  'restart-yes'() { ui.confirmReset = false; resetAll(); go('pick') },
  example() { ui.example = true; S.event('example'); render(); $('.modal [data-a="close-ex"]')?.focus() },
  'close-ex'() { ui.example = false; render() },
  'close-ex-start'() { ui.example = false; go('pick') },
  undo() { undo(); ui.toast = null; render() },
  dept(id) { ui.search = ''; update((s) => { s.dept = id }, { undoable: false }) },
  tpl(id) { update((s) => { const t = taskFromTemplate(id); s.tasks.push(t); s.cur = t.id; s.screen = 'map' }); S.event('task', { template: id }) },
  other() { update((s) => { const t = blankTask('مهمة أخرى'); s.tasks.push(t); s.cur = t.id; s.screen = 'map' }); S.event('task', { template: null }) },
  clone(id) {
    const src = state.tasks.find((t) => t.id === id)
    update((s) => { const t = cloneTask(src, 'مهمة جديدة من خريطة «' + src.title + '»'); s.tasks.push(t); s.cur = t.id; s.screen = 'map' })
  },
  'st-yes'(id) { setStatus(id, 'yes') },
  'st-no'(id) { setStatus(id, 'no') },
  'st-some'(id) { setStatus(id, 'sometimes') },
  'st-restore'(id) { update(() => { stageOf(curTask(), id).status = 'yes' }) },
  open(id) { openStage(id) },
  go(id) { if (id) openStage(id) },
  close() { ui.sheet = null; ui.shareLink = null; render() },
  walk() {
    const act = C.activeStages(curTask())
    const first = act.find((s) => !stageDone(s)) || act[0]
    if (first) openStage(first.id)
  },
  add(i) { addStage(Number(i)) },
  set(id, field, val) {
    const s = stageOf(curTask(), id)
    update((st) => {
      // لمسُ قيمةٍ مقترحة أو مستنتجة يؤكّدها، ولمسُ المؤكَّدة يلغيها
      const same = s[field].v === val
      const confirm = same && s[field].src && s[field].src !== 'user'
      if (field === 'friction') s.friction = { v: same && !confirm ? null : val, reasons: val === 'none' ? [] : s.friction.reasons, src: 'user' }
      else s[field] = { v: same && !confirm ? null : val, src: 'user' }
    })
  },
  tog(id, field, val) {
    const s = stageOf(curTask(), id)
    update(() => {
      if (field === 'channels') {
        if (s.channels.src && s.channels.src !== 'user' && s.channels.v.includes(val)) { s.channels = { v: s.channels.v, src: 'user' }; return }
        s.channels = { v: exclusive(s.channels.v, val), src: 'user' }
      } else if (field === 'reasons') s.friction.reasons = exclusive(s.friction.reasons, val)
      else s[field] = exclusive(s[field], val)
    })
  },
  apply(id, field) {
    const act = C.activeStages(curTask()); const i = act.findIndex((s) => s.id === id)
    const src = act[i]
    update(() => { for (const s of act.slice(i + 1)) s[field] = { v: Array.isArray(src[field].v) ? [...src[field].v] : src[field].v, src: 'user' } })
    toast('طُبّق على المراحل التالية', true)
  },
  'role-new'() { ui.roleDraft = ''; render(); $('[data-in="role"]')?.focus() },
  'role-save'(id) {
    const label = (ui.roleDraft || '').trim()
    if (!label) return
    const k = state.roles.length
    const role = { id: newId('r'), label, color: D.CUSTOM_COLORS[k % D.CUSTOM_COLORS.length], shape: D.CUSTOM_SHAPES[k % D.CUSTOM_SHAPES.length], scope: 'org' }
    ui.roleDraft = null
    update((s) => { s.roles.push(role); stageOf(curTask(), id).actor = { v: role.id, src: 'user' } })
  },
  doc(id, field, d) { const s = stageOf(curTask(), id); update(() => { s[field] = s[field].includes(d) ? s[field].filter((x) => x !== d) : [...s[field], d] }) },
  'doc-new'(id, field) { ui.docPick = { sid: id, field, text: '' }; render(); $('[data-in="doc"]')?.focus() },
  'doc-save'() {
    const p = ui.docPick; const name = p.text.trim(); ui.docPick = null
    if (!name) return render()
    const s = stageOf(curTask(), p.sid)
    update(() => { if (!s[p.field].includes(name)) s[p.field].push(name) })
  },
  move(id, dir) { moveStage(id, Number(dir)) },
  merge(id) { mergeNext(id) },
  del(id) {
    const t = curTask()
    update(() => {
      t.stages = t.stages.filter((s) => s.id !== id)
      t.decisions = t.decisions.filter((d) => d.after !== id).map((d) => (d.back === id ? { ...d, back: null } : d))
    })
    ui.sheet = null
    render()
    toast('حُذفت المرحلة', true)
  },
  'dec-add'(id) {
    const d = { id: newId('d'), after: id, q: 'تُعتمد، أم تُعاد للتعديل؟', back: null, out: '', common: null }
    update(() => { curTask().decisions.push(d) })
    ui.sheet = d.id; render()
  },
  'dec-open'(id) { ui.sheet = id; render() },
  'dec-back'(id, sid) { update(() => { curTask().decisions.find((d) => d.id === id).back = sid || null }) },
  'dec-c'(id, v) { update(() => { const d = curTask().decisions.find((x) => x.id === id); d.common = d.common === v ? null : v }) },
  'dec-del'(id) { update(() => { const t = curTask(); t.decisions = t.decisions.filter((d) => d.id !== id) }); ui.sheet = null; render(); toast('حُذفت نقطة القرار', true) },
  clar(qid, k) {
    const t = curTask(); const q = t.clarifications.find((x) => x.id === qid)
    update(() => { applyClarification(t, q, Number(k) >= 0 ? q.options[Number(k)] : null, state.roles); q.done = true })
  },
  'hint-add'(i) {
    const t = curTask(); const h = D.MISSING_HINTS[i]; const act = C.activeStages(t)
    const st = makeStage(h.name, { actor: h.actor })
    let at = t.stages.length
    if (h.afterFirst && act[0]) at = t.stages.indexOf(act[0]) + 1
    else if (h.before) { const target = act.find((s) => h.before.test(s.name)); if (target) at = t.stages.indexOf(target) }
    ui.grown = st.id
    update(() => { t.stages.splice(at, 0, st); t.dismissed = [...(t.dismissed || []), Number(i)] })
  },
  'hint-no'(i) { update(() => { const t = curTask(); t.dismissed = [...(t.dismissed || []), Number(i)] }) },
  'to-props'() {
    update((s) => { for (const st of curTask().stages) if (st.status === 'pending') st.status = 'yes'; s.screen = 'props' })
    ui.sheet = null
    ACTIONS.walk()
  },
  'to-task'() { ui.sheet = null; go('task') },
  'to-reflect'() { go('reflect') },
  back(screen) { ui.sheet = null; go(screen) },
  g(field, val) { update(() => { const g = curTask().global; g[field] = g[field] === val ? null : val }) },
  gt(field, val) { update(() => { const g = curTask().global; g[field] = exclusive(g[field], val) }) },
  journey(d) { ui.journey = d; render() },
  finish() {
    update((s) => {
      const t = curTask()
      t.completed = true
      t.final = { at: new Date().toISOString(), numbers: C.computeNumbers(t), handoffs: C.handoffs(t, s.roles) }
    })
    S.event('completed', { task: curTask().id })
    go('final')
  },
  print() { S.event('print'); window.print() },
  another() { ui.search = ''; update((s) => { s.cur = null; s.screen = 'pick' }, { undoable: false }); scrollTo(0, 0) },
  async 'share-stage'(id) {
    const url = await createShare({ taskId: curTask().id, stageId: id })
    if (!url) return toast('تعذّر إنشاء الرابط الآن، فحاول بعد قليل.')
    ui.shareLink = { url, stage: id }; ui.shareMsg = 'هذا رابط لزميلك، يفتح على هذه المرحلة ليكمل خصائصها، ويصلنا إشعار حين يكملها.'
    render()
  },
  async 'share-copy'() {
    try { await navigator.clipboard.writeText(ui.shareLink.url); toast('نُسخ الرابط') } catch { $('[data-select]')?.select() }
  },
  'share-native'() { nativeShare(ui.shareLink.url) },
  rec(target) { startRecording(target) },
  'rec-stop'() { ui.recording?.rec.stop() },
}

async function nativeShare(url) {
  try {
    if (navigator.share) await navigator.share({ title: 'رسم سير العمل', text: 'ارسم مهمة من عملنا مرحلةً مرحلة', url })
    else { await navigator.clipboard.writeText(url); toast('نُسخ الرابط') }
  } catch { /* أغلق العميل نافذة المشاركة */ }
}

// ── التفويض: لمسةٌ واحدة، وحقولٌ نصّية
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]')
  if (!el || el.disabled) return
  if (el.closest('.card') && ui.dragMoved) return
  const [name, ...args] = el.dataset.a.split(':')
  const fn = ACTIONS[name]
  if (fn) { e.preventDefault(); fn(...args) }
})
document.addEventListener('submit', (e) => e.preventDefault())

let inputSnap = null
document.addEventListener('focusin', (e) => { if (e.target.dataset?.in) inputSnap = null; if (e.target.matches?.('[data-select]')) e.target.select() })
document.addEventListener('input', (e) => {
  const key = e.target.dataset?.in
  if (!key) return
  const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
  const [k, id] = key.split(':')
  const t = curTask()
  if (k === 'search') { ui.search = v; return render() }
  if (k === 'role') { ui.roleDraft = v; return }
  if (k === 'doc') { ui.docPick.text = v; return }
  const first = inputSnap !== key // الكتابةُ تُحفظ مع كل حرف، ولقطةُ التراجع مرّةً لكل حقل
  inputSnap = key
  update(() => {
    if (k === 'title') t.title = v.trim() || 'مهمة أخرى'
    else if (k === 'name') { const st = stageOf(t, id); st.name = v; st.guide = false }
    else if (k === 'cond') stageOf(t, id).condition = v
    else if (k === 'note') stageOf(t, id).note = v
    else if (k === 'dq') t.decisions.find((d) => d.id === id).q = v
    else if (k === 'dout') t.decisions.find((d) => d.id === id).out = v
    else if (k === 'systems') t.systems = v
    else if (['freqNum', 'seasonWhen', 'team', 'exitOther'].includes(k)) t.global[k] = v
  }, { undoable: first, render: false })
  if (['name', 'cond', 'dq', 'dout'].includes(k)) {
    // تحديثُ البطاقة دون إعادة رسم اللوحة، حتى لا يضيع موضعُ المؤشّر
    const keep = $('#track-wrap')?.scrollLeft
    $('#main').innerHTML = SCREENS[state.screen]()
    if ($('#track-wrap') && keep != null) $('#track-wrap').scrollLeft = keep
    requestAnimationFrame(R.drawArrows)
  }
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (ui.example) { ui.example = false; render() } else if (ui.sheet) { ui.sheet = null; render() } }
  if (e.key === 'Enter' && e.target.dataset?.in === 'role') { e.preventDefault(); ACTIONS['role-save'](ui.sheet) }
  if (e.key === 'Enter' && e.target.dataset?.in === 'doc') { e.preventDefault(); ACTIONS['doc-save']() }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.target.closest('input,textarea')) { e.preventDefault(); ACTIONS.undo() }
})
$('#scrim').addEventListener('click', () => { ui.sheet = null; render() })

// ── السحبُ لتغيير الترتيب (ومعه بديلٌ بالأزرار في لوحة الخصائص)
document.addEventListener('pointerdown', (e) => {
  const grip = e.target.closest('[data-grip]')
  if (!grip) return
  e.preventDefault()
  const card = grip.closest('.card')
  const horizontal = getComputedStyle($('#track')).flexDirection === 'row'
  ui.drag = { id: grip.dataset.grip, card, horizontal, x: e.clientX, y: e.clientY }
  ui.dragMoved = false
  card.classList.add('dragging')
  grip.setPointerCapture(e.pointerId)
})
document.addEventListener('pointermove', (e) => {
  const d = ui.drag
  if (!d) return
  const dx = e.clientX - d.x, dy = e.clientY - d.y
  if (Math.abs(dx) + Math.abs(dy) > 6) ui.dragMoved = true
  d.card.style.transform = d.horizontal ? `translateX(${dx}px)` : `translateY(${dy}px)`
})
function endDrag(e, cancelled) {
  const d = ui.drag
  if (!d) return
  ui.drag = null
  d.card.style.transform = ''
  d.card.classList.remove('dragging')
  if (cancelled) { ui.dragMoved = false; return }
  if (!ui.dragMoved) { setTimeout(() => (ui.dragMoved = false)); return openStage(d.id) }
  const t = curTask()
  const cards = [...document.querySelectorAll('#track .card, #track .folded')].filter((c) => c.dataset.sid !== d.id)
  const pos = d.horizontal ? e.clientX : e.clientY
  let index = cards.length
  for (let i = 0; i < cards.length; i++) {
    const r = cards[i].getBoundingClientRect()
    const mid = d.horizontal ? r.left + r.width / 2 : r.top + r.height / 2
    if (d.horizontal ? pos > mid : pos < mid) { index = i; break } // المسارُ من اليمين: ما كان يمين المؤشّر قبله
  }
  const targetId = cards[index]?.dataset.sid
  update(() => {
    const [s] = t.stages.splice(t.stages.findIndex((x) => x.id === d.id), 1)
    t.stages.splice(targetId ? t.stages.findIndex((x) => x.id === targetId) : t.stages.length, 0, s)
  })
  setTimeout(() => (ui.dragMoved = false))
}
document.addEventListener('pointerup', (e) => endDrag(e, false))
document.addEventListener('pointercancel', (e) => endDrag(e, true))
addEventListener('blur', () => ui.drag && endDrag(null, true))
addEventListener('resize', () => requestAnimationFrame(R.drawArrows))

// ── البدء: الرابط الخاص إن وُجد، ثم الرسم
onChange(render)
onSynced((r) => { for (const note of r?.notices || []) toast(note.text) })
render()
;(async () => {
  if (!S.online()) return
  const r = await S.open()
  if (!r || r.error) {
    if (r?.error === 404) $('#app').innerHTML = `<main class="page gone">${R.logo()}<h1>هذا الرابط غير صالح</h1><p class="lead">ربما أُلغي أو نُسخ ناقصًا. اطلب من فريق إذكاء رابطًا جديدًا.</p></main>`
    return // غير ذلك: نعمل من المحفوظ في المتصفح ونزامن حين يعود الاتصال
  }
  setOrg(r.org)
  ui.caps = r.capabilities || ui.caps
  extraTemplates.splice(0, extraTemplates.length, ...(r.templates || []))
  hydrate(r.state)
  // رابطٌ أرسله زميل: يفتح على المهمة والمرحلة المقصودتين
  const q = new URLSearchParams(location.search)
  const taskId = q.get('مهمة'); const stageId = q.get('مرحلة')
  if (taskId && state.tasks.some((t) => t.id === taskId)) {
    update((s) => { s.cur = taskId; s.screen = stageId ? 'props' : 'map' }, { undoable: false, render: false })
    if (stageId) ui.sheet = stageId
  }
  S.event('opened')
  render()
  for (const note of r.notices || []) toast(note.text)
})()
