// ═══ صفحة رسم سير العمل — الواجهة ═══
// كلُّ شاشةٍ دالّةٌ تُرجع نصَّ HTML من الحالة، وكلُّ لمسةٍ تمرّ بـ`update()` فتُحفظ ويُعاد الرسم.
// الأفعالُ تُعلَّق على `data-a` وتُفضّ من موضعٍ واحد (`ACTIONS`)؛ والحقولُ النصّية على `data-in`.

import * as D from './data.js'
import * as C from './calc.js'
import { D_NAME, D_NAME_GOLD, D_DOTS, D_DIAMOND, BOX } from './logo.js'
import {
  state, update, undo, canUndo, onChange, curTask, roleOf, allRoles, ORG,
  makeStage, taskFromTemplate, blankTask, cloneTask, newId, resetAll,
} from './store.js'

// رابطُ حجز الجلسة — قرارٌ مفتوح؛ إن بقي فارغًا سُجّل الطلبُ وأُخبر العميل أن الفريق سيتواصل معه
const BOOKING_URL = ''

// ── أدوات
const $ = (s, el = document) => el.querySelector(s)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const NF = new Intl.NumberFormat('ar-SA-u-nu-arab', { maximumFractionDigits: 1 })
const n = (x) => NF.format(x)
const pct = (x) => new Intl.NumberFormat('ar-SA-u-nu-arab', { style: 'percent', maximumFractionDigits: 0 }).format(x)
const ORD = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة']
const byId = (list, id) => list.find((x) => x.id === id)
const words = (s) => (s.trim().match(/\S+/g) || []).length
const isUnknown = (v) => v === D.UNKNOWN

const ui = { sheet: null, mode: 'now', search: '', toast: null, guided: null, example: false, drag: null, focusName: false, method: null, docPick: null, booked: false, note: '' }

function logo(kind = 'lockup', cls = 'logo') {
  const vb = BOX[kind]
  const parts = kind === 'lockup'
    ? `<path d="${D_NAME}" fill="var(--ink)"/><path d="${D_NAME_GOLD}" fill="var(--gold)"/><path d="${D_DOTS}" fill="var(--ink)"/><path d="${D_DIAMOND}" fill="var(--gold)"/>`
    : `<path d="${D_DIAMOND}" fill="var(--gold)"/>`
  return `<svg class="${cls}" viewBox="${vb}" role="img" aria-label="إذكاء">${parts}</svg>`
}

const shape = (role) => role ? `<i class="sh ${role.shape}" style="--c:${role.color}" aria-hidden="true"></i>` : ''
const chip = (a, label, pressed, extra = '') =>
  `<button type="button" class="chip ${extra}" data-a="${a}" aria-pressed="${pressed ? 'true' : 'false'}">${label}</button>`
const unk = (a, pressed) => chip(a, 'لا أعرف', pressed, 'unk')

// ── الخطوات: «الخطوة الثالثة من خمس»
const STEP_OF = { pick: 1, method: 1, story: 1, map: 2, props: 3, task: 4, reflect: 5, final: 5 }

function header() {
  const step = STEP_OF[state.screen]
  const dots = step ? `<span class="dots" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<i class="${i < step ? 'done' : i === step ? 'now' : ''}"></i>`).join('')}</span>` : ''
  return `<header class="top">
    ${logo()}
    ${ORG ? `<span class="org">${esc(ORG)}</span>` : ''}
    <span class="sp"></span>
    ${step ? `<span class="steps">${dots}<span>الخطوة ${ORD[step - 1]} من خمس</span></span>` : ''}
    ${state.screen !== 'welcome' ? `<button class="icon-btn" data-a="undo" ${canUndo() ? '' : 'disabled'} aria-label="تراجع عن آخر تغيير">↶ تراجع</button>` : ''}
  </header>`
}

// ════════════ الشاشات ════════════

function welcome() {
  const field = Array.from({ length: 27 }, (_, i) => `<i class="${i === 13 ? 'g' : ''}"></i>`).join('')
  const resume = state.tasks.length > 0
  return `<section class="page welcome">
    <div class="field-row" aria-hidden="true">${field}</div>
    <p class="eyebrow">${ORG ? esc(ORG) : 'إذكاء'}</p>
    <h1>ارسموا مهمةً واحدة من عملكم، مرحلةً مرحلة</h1>
    <p class="lead">تخرجون بخريطةٍ واضحة لهذه المهمة، وتصوّرٍ أوليّ لما يمكن أن تصير إليه. ونحن نفهم منها عملكم كما هو، قبل أن نقترح شيئًا.</p>
    <dl class="facts">
      <div><dt>المدة</dt><dd>نحو عشر دقائق للمهمة الواحدة</dd></div>
      <div><dt>ما تفعلونه</dt><dd>تختارون مهمة، وتصحّحون مسودتها بلمسات</dd></div>
      <div><dt>ما تخرجون به</dt><dd>خريطةُ المهمة وأرقامُها، في ملفٍّ قابل للطباعة</dd></div>
    </dl>
    <div class="trust">
      <strong>قبل أن تبدؤوا</strong>
      <ul>
        <li>المطلوب وصفُ الإجراء، لا تفاصيلُ القضايا. لا نطلب أسماءً ولا أرقامَ قضايا ولا أسماءَ خصوم.</li>
        <li>ما تكتبونه محفوظٌ داخل المملكة، ولا يطّلع عليه إلا فريق إذكاء.</li>
        <li>«لا أعرف» جوابٌ مقبول في كل سؤال، ولا شيء نهائيّ حتى تقولوا: اكتملت المهمة.</li>
      </ul>
    </div>
    <div class="actions" style="margin-top:28px">
      <button class="btn primary" data-a="start">${resume ? 'أكمل من حيث توقفت' : 'ابدأ'}</button>
      <button class="btn ghost" data-a="example">شاهد مثالًا</button>
      ${resume ? `<button class="btn link" data-a="restart">ابدأ من جديد</button>` : ''}
    </div>
  </section>`
}

function pick() {
  const q = ui.search.trim()
  const list = D.TEMPLATES.filter((t) => (q ? (t.title + ' ' + t.sub + ' ' + t.keywords).includes(q) : t.dept === state.dept))
  const prev = state.tasks.filter((t) => t.completed)
  return `<section class="page">
    <p class="eyebrow">اختيار المهمة</p>
    <h1>أيُّ مهمةٍ تُتعبكم أكثر؟</h1>
    <p class="lead">ابدؤوا بها؛ فهي أوضحُ ما يُرسم، وأنفعُ ما يُدرس.</p>
    <div class="q">
      <span class="ql">في أي إدارة؟</span>
      <div class="seg" role="group" aria-label="الإدارة">
        ${D.DEPTS.map((d) => `<button data-a="dept:${d.id}" aria-pressed="${state.dept === d.id && !q}">${d.label}</button>`).join('')}
      </div>
    </div>
    <div class="q">
      <label for="search">ابحث بكلمة، أو اختر من البطاقات</label>
      <input id="search" class="input" data-in="search" value="${esc(ui.search)}" placeholder="مثل: عقد، وكالة، اعتراض" autocomplete="off">
    </div>
    <div class="tpl-grid">
      ${list.map((t) => `<button class="tpl" data-a="tpl:${t.id}"><i class="mk"></i><div><b>${t.title}</b><span>${t.sub}</span></div></button>`).join('')}
      <button class="tpl other" data-a="other"><i class="mk"></i><div><b>مهمة أخرى</b><span>ليست في البطاقات؟ احكوها بكلامكم</span></div></button>
    </div>
    ${prev.length ? `<div class="q"><span class="ql">أو ابدؤوا من خريطةٍ رسمتموها</span><div class="chips">${prev.map((t) => chip('clone:' + t.id, esc(t.title), false)).join('')}</div><span class="hint" style="margin-top:8px">إن تشابهت المهمتان، فالتعديل أسرع من الرسم.</span></div>` : ''}
  </section>`
}

function method() {
  const t = curTask()
  return `<section class="page">
    <p class="eyebrow">${esc(t?.title || '')}</p>
    <h1>كيف تحبون أن ترسموها؟</h1>
    <div class="twin">
      <button class="choice" data-a="m-story"><h3>احكِها بكلامك</h3><p>كما تحكيها لزميلٍ جديد، كتابةً. نرتّب كلامك مراحل، وتصحّح ما لم نُصِب فيه.</p></button>
      <button class="choice" data-a="m-tpl"><h3>ابدأ من قالب</h3><p>مسودةٌ لهذه المهمة كما تجري في كثير من الجهات؛ تمرّ على مراحلها وتجيب بلمسة: هل تمرّون بها؟</p></button>
    </div>
  </section>`
}

function story() {
  const t = curTask()
  const g = ui.guided
  if (g) {
    return `<section class="page">
      <p class="eyebrow">احكِها بكلامك</p>
      <h2>${esc(D.PROMPTS[g.i])}</h2>
      <p class="lead small">سؤالٌ ${n(g.i + 1)} من ${n(D.PROMPTS.length)}. أجب بجملةٍ أو جملتين، أو تجاوزه.</p>
      <div class="q"><textarea class="textarea" data-in="guided" aria-label="${esc(D.PROMPTS[g.i])}" style="min-height:110px">${esc(g.answers[g.i] || '')}</textarea></div>
      <div class="actions" style="margin-top:16px">
        <button class="btn primary" data-a="g-next">${g.i < D.PROMPTS.length - 1 ? 'التالي' : 'انتهيت'}</button>
        <button class="btn ghost" data-a="g-skip">لا أعرف</button>
      </div>
    </section>`
  }
  const wc = words(t.story || '')
  return `<section class="page">
    <p class="eyebrow">${esc(t.title)}</p>
    <h1>احكِها كما تحكيها لزميلٍ جديد</h1>
    <p class="lead">من أولها إلى آخرها، بكلامك المعتاد. لا يلزم ترتيبٌ ولا فصاحة.</p>
    <div class="q">
      <label for="story" class="sr">حكاية المهمة</label>
      <textarea id="story" class="textarea" data-in="story" style="min-height:200px" placeholder="يبدأ الأمر حين...">${esc(t.story || '')}</textarea>
      <div class="count" aria-live="polite">${n(wc)} كلمة</div>
      <p class="privacy">لا حاجة لذكر أسماء الأشخاص أو تفاصيل القضايا، يكفي وصفُ الإجراء.</p>
    </div>
    <div class="q">
      <span class="ql">أسئلةٌ تعينك، لا يلزم الترتيب</span>
      <ul class="prompts">${D.PROMPTS.map((p) => `<li>${p}</li>`).join('')}</ul>
      <div class="example"><b>مثالٌ على مستوى الحكاية</b>${esc(D.STORY_EXAMPLE)}</div>
    </div>
    <div class="actions" style="margin-top:24px">
      <button class="btn primary" data-a="story-go">رتّب كلامي</button>
      ${t.templateId ? `<button class="btn link" data-a="m-tpl">أفضّل البدء من القالب</button>` : ''}
    </div>
  </section>`
}

// ── المسار: يُرسم في الرسم والمراجعة والانعكاس والمثال
const WAIT_LEN = { none: 26, hours: 40, '1to3': 72, week: 112, gtweek: 150 }
const WAIT_DOT = { none: 9, hours: 9, '1to3': 7, week: 6, gtweek: 5 }

function marksOf(s) {
  const role = roleOf(s.actor.v)
  const ch = s.channels.v.filter((c) => c !== D.UNKNOWN).map((c) => byId(D.CHANNELS, c)?.label).filter(Boolean)
  const work = byId(D.WORK, s.work.v)
  const fr = s.friction.v
  const sug = (src) => (src === 'suggested' ? 'sug' : '')
  const out = []
  out.push(role ? `<span class="${sug(s.actor.src)}">${shape(role)}${esc(role.label)}</span>` : isUnknown(s.actor.v) ? `<span class="faint">المنفّذ: لا أعرف</span>` : `<span class="faint">من يتولاها؟</span>`)
  if (ch.length) out.push(`<span class="${sug(s.channels.src)}">${esc(ch.join('، '))}</span>`)
  if (work) out.push(`<span>${work.short}</span>`)
  if (fr === 'often') out.push(`<span class="fric">◆ تتعطل كثيرًا</span>`)
  else if (fr === 'sometimes') out.push(`<span class="fric">تتعطل أحيانًا</span>`)
  return out.join('')
}

function trackHTML(task, mode) {
  const edit = mode === 'map' || mode === 'props'
  const showFolded = edit
  const stages = task.stages.filter((s) => showFolded || s.status !== 'no')
  const act = C.activeStages(task)
  const tr = mode === 'reflect' ? C.transform(task) : new Map()
  const decAfter = (id) => task.decisions.filter((d) => d.after === id)
  const g = task.global
  const entryLabel = g.entry.length && !g.entry.includes(D.UNKNOWN) ? g.entry.map((e) => byId(D.ENTRY, e)?.label).join('، ') : task.entryHint
  const exitLabel = g.exit && g.exit !== D.UNKNOWN ? (g.exit === 'other' && g.exitOther ? g.exitOther : byId(D.EXIT, g.exit)?.label) : task.exitHint
  let html = ''
  if (entryLabel) html += `<div class="end-pill"><span>البداية</span><b>${esc(entryLabel)}</b></div>`
  let prevActive = null
  let num = 0
  stages.forEach((s, i) => {
    if (s.status === 'no') {
      html += gapHTML(null, null, i, edit, false, null)
      html += `<div class="folded" data-sid="${s.id}"><s>${esc(s.name)}</s><button class="btn link" data-a="st-restore:${s.id}">استرجاع</button></div>`
      return
    }
    num++
    const t = tr.get(s.id)
    html += gapHTML(s, prevActive, i, edit, (i > 0 || !!entryLabel), t)
    html += cardHTML(s, num, mode, t)
    for (const d of decAfter(s.id)) html += decHTML(d, task, edit)
    prevActive = s
  })
  if (edit) html += `<button class="plus end" data-a="add:${task.stages.length}" aria-label="أضف مرحلة في آخر المسار">+ أضف مرحلة</button>`
  if (exitLabel) html += `${edit ? '' : '<div class="gap still" style="--len:26px"></div>'}<div class="end-pill"><span>النهاية</span><b>${esc(exitLabel)}</b></div>`
  return `<div class="track-wrap" ${mode === 'view' ? '' : 'id="track-wrap"'}><div class="track ${mode === 'reflect' && ui.mode === 'after' ? 'after' : ''}" ${mode === 'view' ? '' : 'id="track"'} data-mode="${mode}">${html}<svg class="arrows" aria-hidden="true"></svg></div></div>`
}

function gapHTML(s, prev, index, edit, show, t) {
  const plus = edit ? `<button class="plus" data-a="add:${index}" aria-label="أضف مرحلة هنا">+</button>` : ''
  if (!s || !show) return edit && index > 0 ? `<div class="gap still" style="--len:30px">${plus}</div>` : (edit ? `<div class="gap still" style="--len:18px">${plus}</div>` : '')
  const w = s.wait.v && !isUnknown(s.wait.v) ? s.wait.v : null
  const len = w ? WAIT_LEN[w] : 30
  const dot = w ? WAIT_DOT[w] : 9
  const waitObj = byId(D.WAIT, w)
  const tag = waitObj && waitObj.days >= 2 ? `<span class="wait-tag ${waitObj.days >= 5 ? 'long' : ''}">انتظار: ${waitObj.label}</span>` : ''
  let hand = ''
  if (prev && prev.actor.v && s.actor.v && prev.actor.v !== s.actor.v && !isUnknown(prev.actor.v) && !isUnknown(s.actor.v)) {
    const sa = roleOf(prev.actor.v)?.scope, sb = roleOf(s.actor.v)?.scope
    const ext = sa === 'external' || sb === 'external'
    const slow = waitObj && waitObj.days >= 1
    hand = `<span class="hand ${ext ? 'external' : ''} ${slow ? 'slow' : ''}" title="تنتقل المهمة إلى يدٍ أخرى" aria-label="انتقالٌ إلى يدٍ أخرى">⇠</span>`
  }
  const lenAfter = t ? (t.merge ? 4 : t.waitTo === 'none' ? 18 : t.waitTo === 'hours' ? Math.min(len, 36) : len) : len
  return `<div class="gap ${w ? '' : 'still'}" style="--len:${len}px;--len-after:${lenAfter}px;--dot:${dot}px" ${t?.merge ? 'data-merged="1"' : ''}>${hand}${tag}${plus}</div>`
}

function cardHTML(s, num, mode, t) {
  const role = roleOf(s.actor.v)
  const pending = s.status === 'pending'
  const cls = ['card', s.status === 'sometimes' ? 'cond' : '', pending ? 'pending' : '', s.guide ? 'guide' : '',
    s.friction.v === 'often' ? 'hot' : '', ui.sheet === s.id ? 'selected' : '', ui.grown === s.id ? 'grow' : ''].join(' ')
  const edit = mode === 'map' || mode === 'props'
  const style = role ? `--actor:${role.color}` : ''
  const tAttrs = t ? `data-tk="${t.kind}" data-merge="${t.merge ? 1 : 0}" style="${style};--fade:${t.fade ?? 0}"` : `style="${style}"`
  const ask = pending && edit ? `<div class="ask"><span class="lbl">هل تمرّون بها؟</span>
      ${chip('st-yes:' + s.id, 'نعم', false)}${chip('st-no:' + s.id, 'لا', false)}${chip('st-some:' + s.id, 'أحيانًا', false)}</div>` : ''
  const cond = s.status === 'sometimes' ? `<span class="cond-tag">${s.condition ? 'تحدث ' + esc(s.condition) : 'تحدث أحيانًا'}</span>` : ''
  return `<article class="${cls}" data-sid="${s.id}" ${tAttrs}>
    ${edit ? `<button class="open" data-a="open:${s.id}" aria-label="خصائص المرحلة: ${esc(s.name)}"></button>` : ''}
    <div class="row">
      <span class="num">${n(num)}</span>
      <span class="nm">${esc(s.name)}</span>
      ${edit ? `<button class="grip" data-grip="${s.id}" aria-label="اسحب لتغيير الترتيب">⋮⋮</button>` : ''}
    </div>
    ${cond ? `<div class="marks">${cond}</div>` : ''}
    ${!pending && !s.guide ? `<div class="marks">${marksOf(s)}</div>` : ''}
    ${ask}
    ${t ? `<span class="after-tag">${esc(t.rule)}</span>` : ''}
  </article>`
}

function decHTML(d, task, edit) {
  const back = task.stages.find((s) => s.id === d.back)
  const branch = back ? `وإلا ترجع إلى «${esc(back.name)}»` : d.out ? `وإلا: ${esc(d.out)}` : ''
  const freq = d.common === 'common' ? ' — يحدث كثيرًا' : d.common === 'rare' ? ' — نادرًا' : ''
  return `<div class="dec" data-did="${d.id}" ${back ? `data-back="${back.id}"` : ''}>
    ${edit ? `<button class="edit" data-a="dec-open:${d.id}" aria-label="تعديل نقطة القرار: ${esc(d.q)}"></button>` : ''}
    <span class="dia" aria-hidden="true"><span>؟</span></span>
    <span class="body"><b>${esc(d.q)}</b><span class="br">${branch}${freq}</span></span>
  </div>`
}

/** أسهمُ الرجوع: تُرسم بعد التخطيط بقياس المواضع، لكل مسارٍ في الصفحة. */
function drawArrows() { document.querySelectorAll('.track').forEach(drawArrowsFor) }
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
      const x1 = a.left - tb.left - 2, y1 = a.top + a.height / 2 - tb.top
      const x2 = b.left - tb.left - 2, y2 = b.top + 22 - tb.top
      const out = Math.max(8, Math.min(x1, x2) - 30)
      paths += `<path d="M${x1},${y1} C${out},${y1} ${out},${y2} ${x2},${y2}"/><path class="head" d="M${x2 - 8},${y2 - 4} L${x2 - 8},${y2 + 4} L${x2},${y2} Z"/>`
    }
  })
  svg.setAttribute('width', track.scrollWidth); svg.setAttribute('height', track.scrollHeight)
  svg.innerHTML = paths
}

function legend(task) {
  const used = [...new Set(C.activeStages(task).map((s) => s.actor.v).filter((v) => v && !isUnknown(v)))].map(roleOf).filter(Boolean)
  if (!used.length) return ''
  return `<div class="legend" aria-label="المنفّذون">${used.map((r) => `<span>${shape(r)}${esc(r.label)}</span>`).join('')}<span><i class="sh" style="--c:var(--warm)"></i>تتعطل كثيرًا</span><span>⇠ انتقالٌ إلى يدٍ أخرى</span></div>`
}

function mapScreen() {
  const t = curTask()
  const pending = t.stages.filter((s) => s.status === 'pending').length
  const banner = t.source === 'template'
    ? 'هكذا تجري هذه المهمة في كثير من الجهات، فهل هكذا عندكم؟'
    : t.source === 'story-fallback'
      ? 'احتفظنا بحكايتك كما هي. ولتختصر الوقت، هذه أقرب مسودة إلى ما وصفت؛ فصحِّح ما لا يوافق عملك.'
      : t.source === 'story-guide'
        ? 'احتفظنا بحكايتك كما هي. ابنِ المراحل من هنا، وحكايتك أمامك.'
        : t.source === 'clone' ? 'بدأنا من خريطتك السابقة؛ عدّل ما يختلف في هذه المهمة.'
          : 'ثلاث مراحل إرشادية تبدأ منها. سمِّ كل مرحلة بلفظ جهتك، وأضف ما بينها.'
  return `<section class="page wide">
    <div class="canvas-head">
      <p class="eyebrow">${esc(t.title)}</p>
      <p class="banner">${banner}</p>
      ${t.story ? `<details class="story-box" style="margin-top:12px"><summary>حكايتك كما كتبتها</summary><p style="margin-top:8px">${esc(t.story)}</p></details>` : ''}
      <p class="rule-line">المرحلةُ الواحدة: ما يُنجَز دون أن ينتقل الملفّ إلى يدٍ أخرى أو ينتظر.</p>
      <p class="small muted" style="margin-top:10px">المس أي مرحلة لتعديل اسمها أو حذفها أو دمجها، واسحبها من ⋮⋮ لتغيير ترتيبها، وأضف بين أي مرحلتين بعلامة +.</p>
    </div>
    ${trackHTML(t, 'map')}
    ${missingHint(t)}
  </section>
  <div class="bar"><div class="in">
    <span class="note">${pending ? `بقيت ${n(pending)} ${pending === 1 ? 'مرحلة' : pending === 2 ? 'مرحلتان' : 'مراحل'} لم تُجب عنها` : 'المراحل جاهزة'}</span>
    <button class="btn primary" data-a="to-props">${pending ? 'هكذا عندنا، تابع' : 'تابع إلى الخصائص'}</button>
  </div></div>`
}

function missingHint(t) {
  if (t.stages.some((s) => s.status === 'pending')) return ''
  const names = C.activeStages(t).map((s) => s.name).join(' ')
  t.dismissed = t.dismissed || []
  const i = D.MISSING_HINTS.findIndex((h, k) => !t.dismissed.includes(k) && !h.has.test(names) && C.activeStages(t).length >= 3)
  if (i < 0) return ''
  return `<div class="suggest" role="note"><p>${esc(D.MISSING_HINTS[i].ask)}</p>
    <button class="btn ghost" style="min-height:40px" data-a="hint-add:${i}">نعم، أضفها</button>
    <button class="btn link" data-a="hint-no:${i}">لا</button></div>`
}

function propsScreen() {
  const t = curTask()
  const act = C.activeStages(t)
  const done = act.filter((s) => s.actor.v && s.work.v && s.wait.v && s.friction.v && s.actor.src !== 'suggested').length
  return `<section class="page wide">
    <div class="canvas-head">
      <p class="eyebrow">${esc(t.title)}</p>
      <p class="banner">خصائص كل مرحلة: من يتولاها، وكيف، وكم تأخذ.</p>
      <p class="small muted" style="margin-top:8px">نحو عشرين ثانيةً لكل مرحلة، وكلها باللمس. ابدأ من الأولى، و«التالية» تنقلك إلى ما بعدها.</p>
      ${legend(t)}
    </div>
    ${trackHTML(t, 'props')}
  </section>
  <div class="bar"><div class="in">
    <span class="note">أُكملت ${n(done)} من ${n(act.length)}</span>
    ${done === 0 ? `<button class="btn primary" data-a="walk">ابدأ بالمرحلة الأولى</button>` : `<button class="btn primary" data-a="to-task">تابع إلى أسئلة المهمة</button>`}
  </div></div>`
}

// ── لوحة الخصائص
function sheetHTML() {
  const t = curTask()
  if (!t || !ui.sheet) return ''
  if (ui.sheet.startsWith('d')) return decSheet(t, t.decisions.find((d) => d.id === ui.sheet))
  const s = t.stages.find((x) => x.id === ui.sheet)
  if (!s) return ''
  const act = C.activeStages(t)
  const idx = act.findIndex((x) => x.id === s.id)
  const isLast = idx === act.length - 1
  const roles = allRoles()
  const fr = s.friction.v
  const firstWait = !state.seenWaitHint
  const id = s.id
  const sing = (field, list) => list.map((o) => chip(`set:${id}:${field}:${o.id}`, o.label, s[field].v === o.id)).join('') + unk(`set:${id}:${field}:${D.UNKNOWN}`, isUnknown(s[field].v))
  return `<div class="handle"></div>
  <div class="s-head"><span>${idx >= 0 ? `المرحلة ${n(idx + 1)} من ${n(act.length)}` : ''}</span><span class="sp"></span><button class="icon-btn" data-a="close" aria-label="إغلاق">إغلاق</button></div>
  <label class="sr" for="stage-name">اسم المرحلة</label>
  <input id="stage-name" class="name-in" data-in="name:${id}" value="${esc(s.guide ? '' : s.name)}" placeholder="${esc(s.guide ? s.name : 'اسم المرحلة بلفظ جهتك')}">
  ${s.status === 'pending' || s.status === 'sometimes' || t.source === 'template' ? `<div class="q"><span class="ql">هل تمرّون بها؟</span><div class="chips">
    ${chip(`st-yes:${id}`, 'نعم', s.status === 'yes')}${chip(`st-no:${id}`, 'لا', false)}${chip(`st-some:${id}`, 'أحيانًا', s.status === 'sometimes')}</div></div>` : ''}
  ${s.status === 'sometimes' ? `<div class="q"><label class="ql" for="cond">متى تحدث؟</label><input id="cond" class="input" data-in="cond:${id}" value="${esc(s.condition)}" placeholder="مثل: إذا كانت القضية عمالية"></div>` : ''}

  <div class="q"><span class="ql">من يتولى هذه المرحلة؟ ${s.actor.v && !isUnknown(s.actor.v) ? `<button class="apply" data-a="apply:${id}:actor">طبّق على بقية المراحل</button>` : ''}</span>
    <div class="chips">${roles.map((r) => chip(`set:${id}:actor:${r.id}`, `${shape(r)}${esc(r.label)}`, s.actor.v === r.id && s.actor.src !== 'suggested', s.actor.v === r.id && s.actor.src === 'suggested' ? 'suggested' : '')).join('')}
    ${unk(`set:${id}:actor:${D.UNKNOWN}`, isUnknown(s.actor.v))}
    <button type="button" class="chip" data-a="role-new">+ دور آخر</button></div>
    ${ui.roleDraft != null ? `<div style="display:flex;gap:8px;margin-top:10px"><input class="input" data-in="role" value="${esc(ui.roleDraft)}" placeholder="اسم الدور، لا اسم الشخص" aria-label="اسم الدور"><button class="btn ghost" style="min-height:44px" data-a="role-save:${id}">أضف</button></div>` : ''}
  </div>

  <div class="q"><span class="ql">كيف تُنجَز؟ <span class="small muted">اختر ما ينطبق</span> ${s.channels.v.length ? `<button class="apply" data-a="apply:${id}:channels">طبّق على بقية المراحل</button>` : ''}</span>
    <div class="chips">${D.CHANNELS.map((c) => {
      const on = s.channels.v.includes(c.id)
      return chip(`tog:${id}:channels:${c.id}`, c.label, on && s.channels.src !== 'suggested', on && s.channels.src === 'suggested' ? 'suggested' : '')
    }).join('')}${unk(`tog:${id}:channels:${D.UNKNOWN}`, s.channels.v.includes(D.UNKNOWN))}</div>
  </div>

  <div class="q"><span class="ql">كم تستغرق من عملٍ فعلي؟</span><div class="chips">${sing('work', D.WORK)}</div></div>

  <div class="q"><span class="ql">كم تنتظر المهمة قبل أن تبدأ هذه المرحلة؟</span>
    ${firstWait ? `<p class="ex">مثل: المذكرة جاهزة، لكنها تنتظر توقيع المدير ثلاثة أيام. فالانتظار غير مدة العمل.</p>` : ''}
    <div class="chips">${sing('wait', D.WAIT)}</div></div>

  <div class="q"><span class="ql">هل تتعطل المهمة هنا؟</span><div class="chips">${sing('friction', D.FRICTION)}</div></div>
  ${fr === 'sometimes' || fr === 'often' ? `<div class="q"><span class="ql">ما الذي يعطّلها غالبًا؟</span><div class="chips">${D.REASONS.map((r) => chip(`tog:${id}:reasons:${r.id}`, r.label, s.friction.reasons.includes(r.id))).join('')}${unk(`tog:${id}:reasons:${D.UNKNOWN}`, s.friction.reasons.includes(D.UNKNOWN))}</div></div>` : ''}

  <details ${s.docsIn.length || s.docsOut.length || s.constraints.length || s.note ? 'open' : ''}>
    <summary>تفاصيل أكثر <span class="small muted">(اختياري)</span></summary>
    <div class="q"><span class="ql">ما الذي يدخل هذه المرحلة؟</span><div class="chips">${docChips(id, 'docsIn', s.docsIn)}</div></div>
    <div class="q"><span class="ql">وما الذي يخرج منها؟</span><div class="chips">${docChips(id, 'docsOut', s.docsOut)}</div></div>
    ${ui.docPick && ui.docPick.sid === id ? `<div style="display:flex;gap:8px;margin-top:10px"><input class="input" data-in="doc" value="${esc(ui.docPick.text)}" placeholder="اسم المستند" aria-label="اسم المستند"><button class="btn ghost" style="min-height:44px" data-a="doc-save">أضف</button></div>` : ''}
    <div class="q"><span class="ql">هل في هذه المرحلة ما لا يمكن تغييره؟</span><div class="chips">${D.CONSTRAINTS.map((c) => chip(`tog:${id}:constraints:${c.id}`, c.label, s.constraints.includes(c.id))).join('')}${unk(`tog:${id}:constraints:${D.UNKNOWN}`, s.constraints.includes(D.UNKNOWN))}</div></div>
    <div class="q"><label class="ql" for="note">هل تضيف شيئًا؟</label><textarea id="note" class="textarea" style="min-height:80px" data-in="note:${id}">${esc(s.note)}</textarea></div>
  </details>

  <div class="tools">
    <button class="icon-btn" data-a="move:${id}:-1" ${idx <= 0 ? 'disabled' : ''}>قدّمها</button>
    <button class="icon-btn" data-a="move:${id}:1" ${isLast ? 'disabled' : ''}>أخّرها</button>
    <button class="icon-btn" data-a="merge:${id}" ${isLast ? 'disabled' : ''}>ادمجها مع التالية</button>
    <button class="icon-btn" data-a="dec-add:${id}">+ نقطة قرار بعدها</button>
    <button class="icon-btn" data-a="del:${id}">احذفها</button>
  </div>
  <div class="nav">
    ${idx > 0 ? `<button class="btn ghost" data-a="go:${act[idx - 1].id}">السابقة</button>` : ''}
    ${isLast ? `<button class="btn primary" data-a="close">تمّت المراحل</button>` : `<button class="btn primary" data-a="go:${act[idx + 1]?.id}">التالية</button>`}
  </div>`
}

function docChips(id, field, list) {
  const t = curTask()
  // ما يخرج من مرحلةٍ يُقترح مدخلًا للتي تليها
  let suggest = []
  if (field === 'docsIn') {
    const act = C.activeStages(t); const i = act.findIndex((s) => s.id === id)
    if (i > 0) suggest = act[i - 1].docsOut.filter((d) => !list.includes(d))
  }
  const lib = [...new Set([...D.DOCUMENTS, ...list, ...suggest])]
  return lib.map((d) => chip(`doc:${id}:${field}:${d}`, esc(d), list.includes(d), suggest.includes(d) ? 'suggested' : '')).join('') +
    `<button type="button" class="chip" data-a="doc-new:${id}:${field}">+ غيره</button>`
}

function decSheet(t, d) {
  if (!d) return ''
  const act = C.activeStages(t)
  const at = act.findIndex((s) => s.id === d.after)
  const options = act.slice(0, at + 1)
  return `<div class="handle"></div>
  <div class="s-head"><span>نقطة قرار</span><span class="sp"></span><button class="icon-btn" data-a="close">إغلاق</button></div>
  <div class="q"><label class="ql" for="dq">السؤال</label><input id="dq" class="input" data-in="dq:${d.id}" value="${esc(d.q)}" placeholder="مثل: تُعتمد، أم تُعاد للتعديل؟"></div>
  <div class="q"><span class="ql">إن لم يُقبل، إلى أين ترجع؟</span><div class="chips">
    ${options.map((s) => chip(`dec-back:${d.id}:${s.id}`, esc(s.name), d.back === s.id)).join('')}
    ${chip(`dec-back:${d.id}:`, 'تخرج من المسار', !d.back)}</div></div>
  ${!d.back ? `<div class="q"><label class="ql" for="dout">ماذا يحدث عندئذ؟</label><input id="dout" class="input" data-in="dout:${d.id}" value="${esc(d.out)}" placeholder="مثل: يُقفل الملف"></div>` : ''}
  <div class="q"><span class="ql">كم يحدث هذا الرجوع؟</span><div class="chips">
    ${chip(`dec-c:${d.id}:common`, 'شائع', d.common === 'common')}${chip(`dec-c:${d.id}:rare`, 'نادر', d.common === 'rare')}${unk(`dec-c:${d.id}:${D.UNKNOWN}`, isUnknown(d.common))}</div></div>
  <div class="tools"><button class="icon-btn" data-a="dec-del:${d.id}">احذف نقطة القرار</button></div>
  <div class="nav"><button class="btn primary" data-a="close">تم</button></div>`
}

// ── أسئلة المهمة الكلية
function taskScreen() {
  const t = curTask(); const g = t.global
  const one = (field, list) => list.map((o) => chip(`g:${field}:${o.id}`, o.label, g[field] === o.id)).join('') + unk(`g:${field}:${D.UNKNOWN}`, isUnknown(g[field]))
  return `<section class="page">
    <p class="eyebrow">${esc(t.title)}</p>
    <h1>ثلاثة أسئلة عن المهمة كلها</h1>
    <div class="q"><span class="ql">كم مرةً تمرّ بكم هذه المهمة في الشهر تقريبًا؟</span>
      <div class="chips">${one('freq', D.FREQUENCY)}${chip('g:freq:custom', 'أكتب رقمًا', g.freq === 'custom')}</div>
      ${g.freq === 'custom' || g.freq === 'gt100' ? `<input class="input" style="margin-top:10px;max-width:200px" inputmode="numeric" data-in="freqNum" value="${esc(g.freqNum)}" placeholder="العدد في الشهر" aria-label="العدد في الشهر">` : ''}
      <details style="margin-top:12px"><summary class="small muted" style="cursor:pointer">سؤالان إضافيان (اختياري)</summary>
        <div class="q" style="margin-top:12px"><span class="ql">هل هي ثابتة على مدار السنة، أم تشتدّ في أوقات معينة؟</span><div class="chips">
          ${chip('g:seasonal:steady', 'ثابتة', g.seasonal === 'steady')}${chip('g:seasonal:peaks', 'تشتدّ في أوقات', g.seasonal === 'peaks')}${unk('g:seasonal:unknown', isUnknown(g.seasonal))}</div>
          ${g.seasonal === 'peaks' ? `<input class="input" style="margin-top:10px" data-in="seasonWhen" value="${esc(g.seasonWhen)}" placeholder="متى؟ مثل: آخر السنة المالية" aria-label="متى تشتد؟">` : ''}</div>
        <div class="q"><label class="ql" for="team">كم شخصًا يعمل عليها في الإدارة؟</label><input id="team" class="input" style="max-width:200px" inputmode="numeric" data-in="team" value="${esc(g.team)}"></div>
      </details>
    </div>
    <hr class="rule">
    <div class="q"><span class="ql">كيف تصلكم هذه المهمة عادةً؟ <span class="small muted">اختر ما ينطبق</span></span>
      <div class="chips">${D.ENTRY.map((e) => chip(`gt:entry:${e.id}`, e.label, g.entry.includes(e.id))).join('')}${unk(`gt:entry:${D.UNKNOWN}`, g.entry.includes(D.UNKNOWN))}</div></div>
    <div class="q"><span class="ql">ومن يرسلها غالبًا؟</span>
      <div class="chips">${allRoles().map((r) => chip(`g:sender:${r.id}`, `${shape(r)}${esc(r.label)}`, g.sender === r.id)).join('')}${unk(`g:sender:${D.UNKNOWN}`, isUnknown(g.sender))}</div></div>
    <hr class="rule">
    <div class="q"><span class="ql">متى تعدّون المهمة منتهية؟</span><div class="chips">${one('exit', D.EXIT)}</div>
      ${g.exit === 'other' ? `<input class="input" style="margin-top:10px" data-in="exitOther" value="${esc(g.exitOther)}" placeholder="اكتبها باختصار" aria-label="متى تنتهي المهمة">` : ''}</div>
    <div class="q"><span class="ql">وأين يُحفظ أثرها بعد الانتهاء؟</span><div class="chips">${one('storage', D.STORAGE)}</div></div>
    <hr class="rule">
    <div class="q"><span class="ql">هل على هذه المهمة اشتراطاتُ سرّية أو صلاحياتُ اطلاعٍ خاصة؟</span><div class="chips">
      ${chip('g:secret:yes', 'نعم', g.secret === 'yes')}${chip('g:secret:no', 'لا', g.secret === 'no')}${unk(`g:secret:${D.UNKNOWN}`, isUnknown(g.secret))}</div></div>
  </section>
  <div class="bar"><div class="in"><button class="btn ghost" data-a="back:props">رجوع</button><button class="btn primary" data-a="to-reflect">اعرض الخريطة وأرقامها</button></div></div>`
}

// ── الانعكاس
function numbersBlock(task) {
  const N = C.computeNumbers(task)
  const H = C.handoffs(task, state.roles)
  const hr = C.range(N.monthlyHours)
  const cyc = C.approxDays(N.cycleDays)
  const wd = C.approxDays(N.workDays)
  const est = '<p class="est">تقديرٌ مبنيّ على إجاباتك</p>'
  const tiles = []
  tiles.push(hr
    ? `<div class="stat gold"><div class="v">${n(hr[0])}–${n(hr[1])} <small>ساعة عمل</small></div><p class="l">تستهلكها المهمة شهريًّا، وتمرّ بكم نحو ${n(N.times)} ${N.times <= 10 ? 'مرات' : 'مرة'} في الشهر</p>${est}</div>`
    : `<div class="stat"><div class="v"><small>لم يُحسب</small></div><p class="l">ساعات العمل الشهرية تحتاج جوابًا عن تكرار المهمة ومدة مراحلها</p></div>`)
  tiles.push(cyc
    ? `<div class="stat"><div class="v">نحو ${n(cyc)} <small>يوم عمل</small></div><p class="l">تستغرقها المرة الواحدة من بدايتها إلى نهايتها</p>${est}</div>`
    : `<div class="stat"><div class="v"><small>لم يُحسب</small></div><p class="l">زمن الدورة يحتاج مدد العمل والانتظار</p></div>`)
  tiles.push(N.ratio != null && N.cycleDays > 0
    ? `<div class="stat"><div class="v">${pct(N.ratio)}</div><p class="l">نسبة العمل الفعلي منها؛ نحو ${n(wd)} ${wd <= 1 ? 'يوم' : wd === 2 ? 'يومين' : 'أيام'} عمل، والباقي انتظار</p>${est}</div>`
    : `<div class="stat"><div class="v"><small>لم يُحسب</small></div><p class="l">نسبة العمل الفعلي</p></div>`)
  const slow = H.slowest ? roleOf(H.slowest.toActor) : null
  const handSentence = H.list.length
    ? `تنتقل المهمة بين ${n(H.roles)} ${H.roles <= 10 ? 'أدوار' : 'دورًا'} في ${n(H.list.length)} ${H.list.length <= 10 && H.list.length > 2 ? 'مواضع' : H.list.length === 1 ? 'موضع' : H.list.length === 2 ? 'موضعين' : 'موضعًا'}${slow ? `، وأطول انتظارٍ يقع عند انتقالها إلى ${esc(slow.label)}` : ''}.`
    : ''
  const gaps = N.unknownWork + N.unknownWait
  return `<div class="stats">${tiles.join('')}</div>
    ${handSentence ? `<p class="sentence">${handSentence}</p>` : ''}
    ${gaps ? `<p class="small muted" style="margin-top:8px">في ${n(gaps)} ${gaps <= 10 && gaps > 2 ? 'مواضع' : 'موضعًا'} لم تُحدَّد المدة، فلم تدخل الحساب؛ والأرقام أدنى من حقيقتها بقدرها.</p>` : ''}`
}

function crossTasks() {
  const done = state.tasks.filter((t) => t.completed || t.id === state.cur)
  if (done.length < 2) return ''
  const count = new Map()
  for (const t of done) for (const r of new Set(C.activeStages(t).map((s) => s.actor.v).filter((v) => v && !isUnknown(v)))) count.set(r, (count.get(r) || 0) + 1)
  const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!top || top[1] < 2) return ''
  return `<p class="ask-colleague">في المهام التي رسمتموها (${n(done.length)})، يتكرر دور «${esc(roleOf(top[0])?.label)}» في ${n(top[1])} منها.</p>`
}

function reflectScreen() {
  const t = curTask()
  const tr = C.transform(t)
  const act = C.activeStages(t)
  const groups = new Map()
  for (const s of act) { const r = tr.get(s.id); if (r) { if (!groups.has(r.rule)) groups.set(r.rule, { kind: r.kind, names: [] }); groups.get(r.rule).names.push(s.name) } }
  const autoH = C.automatableHours(t)
  const autoR = C.range(autoH)
  const unknowns = act.filter((s) => [s.actor.v, s.work.v, s.wait.v, s.friction.v].some(isUnknown))
  const docs = [...new Set(act.flatMap((s) => [...s.docsIn, ...s.docsOut]))]
  const docJourney = ui.docPick?.journey && docs.includes(ui.docPick.journey) ? ui.docPick.journey : docs[0]
  return `<section class="page wide">
    <div class="reflect-head">
      <p class="eyebrow">${esc(t.title)}</p>
      <h1>هذه مهمتكم كما رسمتموها</h1>
      ${legend(t)}
    </div>
    <div class="toggle-row"><div class="seg" role="group" aria-label="عرض الخريطة">
      <button data-a="mode:now" aria-pressed="${ui.mode === 'now'}">الآن</button>
      <button data-a="mode:after" aria-pressed="${ui.mode === 'after'}">بعد التحويل</button></div></div>
    ${trackHTML(t, 'reflect')}
    <div class="reflect-head" style="margin-top:26px">
      ${ui.mode === 'after' ? `<div class="changes"><h3>ما يتغيّر في التصور الأولي</h3><ul>
        ${[...groups.entries()].map(([rule, g]) => `<li class="${g.kind === 'locked' ? 'locked' : ''}"><b>${esc(g.names.join('، '))}</b>: ${esc(rule)}</li>`).join('')}
        ${t.global.storage === 'none' ? `<li><b>حفظ الأثر بعد الانتهاء</b>: ${esc(C.RULES.library)}</li>` : ''}
      </ul>
      ${autoR ? `<p class="sentence">هذه المراحل تستهلك نحو ${n(autoR[0])}–${n(autoR[1])} ساعة شهريًّا، وهي من النوع الذي تختصره الأتمتة عادة. والتفصيل موضعه الجلسة.</p><p class="small muted">تقديرٌ مبنيّ على إجاباتك، وتصوّرٌ أوليّ لا حلّ.</p>` : `<p class="small muted" style="margin-top:12px">تصوّرٌ أوليّ لا حلّ، مبنيٌّ على قواعد معلنة من إجاباتك.</p>`}</div>` : ''}
      <h2 style="margin-top:28px">أرقامها</h2>
      ${numbersBlock(t)}
      ${crossTasks()}
      ${unknowns.length ? `<p class="ask-colleague">مواضع أجبتم فيها «لا أعرف»: ${unknowns.map((s) => '«' + esc(s.name) + '»').join('، ')}. يمكنكم سؤال زميلٍ عنها ثم العودة إليها.</p>` : ''}
    </div>
    <div class="deep">
      <details><summary>رحلة المستند</summary>
        ${docs.length ? `<div class="chips" style="margin-top:10px">${docs.map((d) => chip('journey:' + d, esc(d), d === docJourney)).join('')}</div>${journeyHTML(t, docJourney)}`
          : '<p class="small muted" style="margin-top:8px">لم تُحدَّد مستنداتٌ للمراحل. يمكنكم إضافتها من «تفاصيل أكثر» في كل مرحلة.</p>'}
      </details>
      <details><summary>الأنظمة والأدوات التي تستخدمونها اليوم</summary>
        <div class="q" style="margin-top:10px"><label class="sr" for="systems">الأنظمة والأدوات</label><textarea id="systems" class="textarea" style="min-height:90px" data-in="systems" placeholder="مثل: نظام الاتصالات الإدارية، مجلد مشترك، ناجز">${esc(t.systems)}</textarea></div>
      </details>
    </div>
  </section>
  <div class="bar"><div class="in"><button class="btn ghost" data-a="back:task">رجوع</button><button class="btn primary" data-a="to-final">التالي</button></div></div>`
}

function journeyHTML(t, doc) {
  if (!doc) return ''
  const act = C.activeStages(t)
  const path = act.filter((s) => s.docsIn.includes(doc) || s.docsOut.includes(doc))
  if (!path.length) return ''
  const hands = new Set(path.map((s) => s.actor.v).filter((v) => v && !isUnknown(v)))
  return `<div class="journey">${path.map((s, i) => `${i ? '<em>←</em>' : ''}<span>${shape(roleOf(s.actor.v))}${esc(s.name)}</span>`).join('')}</div>
    <p class="small muted" style="margin-top:8px">يمرّ «${esc(doc)}» بـ${n(path.length)} ${path.length > 2 && path.length <= 10 ? 'مراحل' : 'مرحلة'}، وفي ${n(hands.size)} ${hands.size > 2 && hands.size <= 10 ? 'أيدٍ' : 'يد'}.</p>`
}

function finalScreen() {
  const t = curTask()
  if (!t.completed) {
    return `<section class="page">
      <p class="eyebrow">سؤالٌ أخير، اختياري</p>
      <h1>لو كان التغيير بيدك، ما أول شيء تغيّره في هذه المهمة؟</h1>
      <div class="q"><label class="sr" for="lastq">جوابك</label><textarea id="lastq" class="textarea" data-in="lastQ" placeholder="جملةٌ واحدة تكفي">${esc(t.lastQ)}</textarea></div>
      <p class="small muted" style="margin-top:14px">لا شيء نهائيّ حتى تضغط «اكتملت المهمة»، ويمكنك الرجوع إلى أي خطوة قبلها.</p>
    </section>
    <div class="bar"><div class="in"><button class="btn ghost" data-a="back:reflect">رجوع</button><button class="btn primary" data-a="finish"><i class="mk"></i> اكتملت المهمة</button></div></div>`
  }
  return `<section class="page">
    <p class="eyebrow">اكتملت المهمة</p>
    <h1>شكرًا لكم. خريطة «${esc(t.title)}» عندنا الآن</h1>
    <p class="lead">سيدرسها فريق إذكاء قبل أن يقترح شيئًا. وهذه أربعة أفعال، كلها اختيارية.</p>
    <div class="closing">
      <button class="act" data-a="print"><i class="mk"></i><div><b>تنزيل الخريطة</b><span>ملفٌّ أنيق قابل للطباعة</span></div></button>
      <button class="act" data-a="book"><i class="mk"></i><div><b>${ui.booked ? 'وصلنا طلبكم' : 'حجز جلسة لمراجعتها'}</b><span>${ui.booked ? 'سيتواصل معكم فريق إذكاء لتحديد الموعد' : 'نراجعها معكم ونجيب عن أسئلتها'}</span></div></button>
      <button class="act" data-a="another"><i class="mk"></i><div><b>إضافة مهمة أخرى</b><span>ويمكنكم البدء من هذه الخريطة إن تشابهتا</span></div></button>
      <button class="act" data-a="share"><i class="mk"></i><div><b>إرسال الرابط إلى زميل</b><span>${ui.shared ? 'نُسخ الرابط' : 'ليرسم مهمةً يعرف تفاصيلها'}</span></div></button>
    </div>
  </section>`
}

// ── المثال المكتمل: جهةٌ افتراضية
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
    s.status = 'yes'; s.actor = { v: a, src: 'user' }; s.channels = { v: ch, src: 'user' }
    s.work = { v: w }; s.wait = { v: wt }; s.friction = { v: f, reasons: rs || [] }
  })
  t.stages[5].docsOut = ['مذكرة جوابية']; t.stages[6].docsIn = ['مذكرة جوابية']; t.stages[7].docsIn = ['مذكرة جوابية']
  t.decisions[0].common = 'common'
  t.global = { ...t.global, freq: '5to20', entry: ['gov'], exit: 'closed', storage: 'shared' }
  return t
}

function exampleModal() {
  const t = exampleTask()
  return `<div class="modal" role="dialog" aria-modal="true" aria-label="مثالٌ مكتمل">
    <header class="top">${logo()}<span class="org">مثالٌ لجهةٍ افتراضية</span><span class="sp"></span><button class="icon-btn" data-a="close-ex">إغلاق المثال</button></header>
    <main style="padding-bottom:40px"><section class="page wide">
      <div class="canvas-head"><p class="eyebrow">مثالٌ مكتمل</p><h2>دعوى مقامة على الجهة، كما رسمتها إدارةٌ افتراضية</h2>
      <p class="small muted" style="margin-top:8px">لون حدّ البطاقة هو من يتولاها، والفاصل بين البطاقات يطول بقدر الانتظار، والسهم المنحني رجوعٌ إلى مرحلة سابقة.</p>${legend(t)}</div>
      ${trackHTML(t, 'view')}
      <div class="reflect-head" style="margin-top:24px">${numbersBlock(t)}
      <div class="actions" style="margin-top:24px"><button class="btn primary" data-a="close-ex-start">ابدأ مهمتك</button></div></div>
    </section></main></div>`
}

// ── الملف القابل للطباعة
function printHTML() {
  const t = curTask()
  if (!t || !['reflect', 'final'].includes(state.screen)) return ''
  const N = C.computeNumbers(t); const hr = C.range(N.monthlyHours); const cyc = C.approxDays(N.cycleDays)
  const tr = C.transform(t)
  const rows = []
  C.activeStages(t).forEach((s, i) => {
    const wait = byId(D.WAIT, s.wait.v)
    if (wait && wait.days >= 2) rows.push(`<tr class="wait"><td></td><td colspan="5">⋯ انتظار: ${wait.label}</td></tr>`)
    const role = roleOf(s.actor.v)
    rows.push(`<tr><td class="n">${n(i + 1)}</td><td>${esc(s.name)}${s.status === 'sometimes' ? ' <span class="muted">(أحيانًا)</span>' : ''}</td><td>${role ? shape(role) + esc(role.label) : '—'}</td>
      <td>${esc(s.channels.v.map((c) => byId(D.CHANNELS, c)?.label).filter(Boolean).join('، ') || '—')}</td><td>${byId(D.WORK, s.work.v)?.label || '—'}</td>
      <td>${s.friction.v === 'often' ? 'تتعطل كثيرًا' : s.friction.v === 'sometimes' ? 'أحيانًا' : '—'}</td></tr>`)
    for (const d of t.decisions.filter((x) => x.after === s.id)) {
      const back = t.stages.find((x) => x.id === d.back)
      rows.push(`<tr class="dec"><td></td><td colspan="5">◇ ${esc(d.q)} ${back ? `— وإلا ترجع إلى «${esc(back.name)}»` : d.out ? '— ' + esc(d.out) : ''}</td></tr>`)
    }
  })
  const changes = C.activeStages(t).filter((s) => tr.get(s.id)).map((s) => `<li><b>${esc(s.name)}</b>: ${esc(tr.get(s.id).rule)}</li>`).join('')
  const date = new Intl.DateTimeFormat('ar-SA-u-nu-arab-ca-gregory', { dateStyle: 'long' }).format(new Date())
  return `<div class="pr">
    <div class="pr-head">${logo()}<div class="meta">${ORG ? esc(ORG) + ' · ' : ''}${date}</div></div>
    <h1>${esc(t.title)}</h1>
    <p class="sub">خريطة المهمة كما رسمتها الإدارة، مرحلةً مرحلة.</p>
    <div class="nums">
      <div><b>${hr ? `${n(hr[0])}–${n(hr[1])}` : '—'}</b><span>ساعة عمل شهريًّا (تقدير)</span></div>
      <div><b>${cyc ? `نحو ${n(cyc)}` : '—'}</b><span>يوم عمل للمرة الواحدة (تقدير)</span></div>
      <div><b>${N.ratio != null ? pct(N.ratio) : '—'}</b><span>نسبة العمل الفعلي (تقدير)</span></div>
    </div>
    <table><thead><tr><th></th><th>المرحلة</th><th>من يتولاها</th><th>الوسيلة</th><th>العمل الفعلي</th><th>التعثر</th></tr></thead><tbody>${rows.join('')}</tbody></table>
    ${changes ? `<h2>تصوّرٌ أوليّ بعد التحويل</h2><ul>${changes}</ul>` : ''}
    <p class="foot">كل رقمٍ هنا تقديرٌ مبنيّ على إجابات الإدارة، معروضٌ نطاقًا لا رقمًا قاطعًا. والتصوّر أوليّ لا حلّ، وتفصيله في الجلسة. · إذكاء</p>
  </div>`
}

// ════════════ الرسم ════════════

const SCREENS = { welcome, pick, method, story, map: mapScreen, props: propsScreen, task: taskScreen, reflect: reflectScreen, final: finalScreen }

function render() {
  const app = $('#app')
  const sheetEl = $('#sheet')
  const sheetScroll = sheetEl.scrollTop
  const trackScroll = $('#track-wrap')?.scrollLeft
  const active = document.activeElement
  const activeKey = active?.dataset?.in || active?.dataset?.a
  const caret = active && 'selectionStart' in active ? active.selectionStart : null

  if (!curTask() && !['welcome', 'pick'].includes(state.screen)) state.screen = 'pick'
  app.innerHTML = header() + `<main id="main">${SCREENS[state.screen]()}</main>`
  $('#print').innerHTML = printHTML()

  const open = !!ui.sheet && ['map', 'props'].includes(state.screen)
  sheetEl.innerHTML = open ? sheetHTML() : ''
  sheetEl.classList.toggle('on', open)
  sheetEl.setAttribute('aria-hidden', open ? 'false' : 'true')
  $('#scrim').classList.toggle('on', open)
  $('#scrim').hidden = !open
  document.body.classList.toggle('sheet-open', open)
  if (open) sheetEl.scrollTop = sheetScroll

  $('#modal').innerHTML = ui.example ? exampleModal() : ''
  $('#toast').innerHTML = ui.toast ? `<div class="toast" role="status"><span>${esc(ui.toast.text)}</span>${ui.toast.undo ? '<button data-a="undo">تراجع</button>' : ''}</div>` : ''

  if (trackScroll != null && $('#track-wrap')) $('#track-wrap').scrollLeft = trackScroll
  // إعادةُ التركيز إلى الحقل نفسِه بعد الرسم
  if (activeKey) {
    const el = document.querySelector(`[data-in="${CSS.escape(activeKey)}"]`) || document.querySelector(`[data-a="${CSS.escape(activeKey)}"]`)
    if (el) { el.focus({ preventScroll: true }); if (caret != null && 'setSelectionRange' in el) try { el.setSelectionRange(caret, caret) } catch {} }
  }
  if (ui.focusName) { ui.focusName = false; const el = $('#stage-name'); el?.focus(); el?.select() }
  ui.grown = null
  requestAnimationFrame(drawArrows)
}

function toast(text, undoable = false) {
  ui.toast = { text, undo: undoable }
  clearTimeout(toast.t)
  toast.t = setTimeout(() => { ui.toast = null; $('#toast').innerHTML = '' }, 5000)
}

// ════════════ الأفعال ════════════

const go = (screen) => update((s) => { s.screen = screen }, { undoable: false })
const stageOf = (t, id) => t.stages.find((s) => s.id === id)

function openStage(id) {
  ui.sheet = id; ui.roleDraft = null; ui.docPick = null
  render()
  scrollCardIntoView(id)
}
function scrollCardIntoView(id) {
  const el = document.querySelector(`.card[data-sid="${id}"]`)
  if (el) el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
}

/** أقربُ قالبٍ إلى الحكاية — بالكلمات الدالّة. بديلُ الترتيب الذكي في المرحلة الأولى من البناء. */
function nearestTemplate(text) {
  let best = null; let score = 0
  for (const t of D.TEMPLATES) {
    const sc = t.keywords.split(' ').reduce((a, k) => a + (text.includes(k) ? 1 : 0), 0)
    if (sc > score) { score = sc; best = t }
  }
  return score >= 2 ? best : null
}

function fromStory() {
  update((s) => {
    const t = curTask()
    const tpl = (t.templateId && D.TEMPLATES.find((x) => x.id === t.templateId)) || nearestTemplate(t.story)
    const keep = { id: t.id, story: t.story, title: t.title }
    const next = tpl ? taskFromTemplate(tpl.id) : blankTask(t.title)
    Object.assign(t, next, keep, { source: tpl ? 'story-fallback' : 'story-guide' })
    s.screen = 'map'
  })
}

function addStage(index) {
  const t = curTask()
  const st = makeStage('', { status: 'yes' })
  st.name = 'مرحلة جديدة'
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
    if (wb && (!wa || wb.hours > wa.hours)) a.work.v = b.work.v
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

function removeStage(id) {
  const t = curTask()
  update(() => {
    t.stages = t.stages.filter((s) => s.id !== id)
    t.decisions = t.decisions.filter((d) => d.after !== id).map((d) => (d.back === id ? { ...d, back: null } : d))
  })
  ui.sheet = null
  toast('حُذفت المرحلة', true)
  render()
}

const ACTIONS = {
  start() {
    if (state.tasks.length && state.cur) return render()
    go(state.tasks.length ? state.screen : 'pick')
    if (state.screen === 'welcome') go('pick')
  },
  restart() { if (confirm('تبدأ من جديد؟ ستُمحى الخرائط المحفوظة في هذا الجهاز.')) { resetAll(); go('pick') } },
  example() { ui.example = true; render() },
  'close-ex'() { ui.example = false; render() },
  'close-ex-start'() { ui.example = false; go('pick') },
  undo() { undo(); ui.toast = null; render() },
  dept(id) { ui.search = ''; update((s) => { s.dept = id }, { undoable: false }) },
  tpl(id) {
    update((s) => { const t = taskFromTemplate(id); s.tasks.push(t); s.cur = t.id; s.screen = 'method' })
  },
  other() {
    update((s) => { const t = blankTask('مهمة أخرى'); t.source = 'story'; s.tasks.push(t); s.cur = t.id; s.screen = 'story' })
  },
  clone(id) {
    const src = state.tasks.find((t) => t.id === id)
    update((s) => { const t = cloneTask(src, src.title + ' (نسخة)'); s.tasks.push(t); s.cur = t.id; s.screen = 'map' })
  },
  'm-story'() { go('story') },
  'm-tpl'() {
    const t = curTask()
    if (t.templateId && t.source !== 'template') update(() => { const keep = { id: t.id, story: t.story }; Object.assign(t, taskFromTemplate(t.templateId), keep) })
    go('map')
  },
  'story-go'() {
    const t = curTask()
    if (words(t.story || '') < 30) { ui.guided = { i: 0, answers: [] }; return render() }
    fromStory()
  },
  'g-next'() { guidedStep(false) },
  'g-skip'() { guidedStep(true) },
  'st-yes'(id) { setStatus(id, 'yes') },
  'st-no'(id) { setStatus(id, 'no') },
  'st-some'(id) { setStatus(id, 'sometimes') },
  'st-restore'(id) { update(() => { stageOf(curTask(), id).status = 'yes' }) },
  open(id) { openStage(id) },
  go(id) { if (id) openStage(id) },
  close() { ui.sheet = null; render() },
  walk() {
    const t = curTask()
    const first = C.activeStages(t).find((s) => !(s.actor.v && s.work.v && s.wait.v && s.friction.v)) || C.activeStages(t)[0]
    if (first) openStage(first.id)
  },
  add(i) { addStage(Number(i)) },
  set(id, field, val) {
    const s = stageOf(curTask(), id)
    update((st) => {
      if (field === 'actor') s.actor = { v: s.actor.v === val && s.actor.src !== 'suggested' ? null : val, src: 'user' }
      else if (field === 'friction') s.friction = { v: s.friction.v === val ? null : val, reasons: val === 'none' ? [] : s.friction.reasons }
      else s[field] = { v: s[field].v === val ? null : val }
      if (field === 'wait') st.seenWaitHint = true
    })
  },
  tog(id, field, val) {
    const s = stageOf(curTask(), id)
    update(() => {
      if (field === 'channels') {
        let v = s.channels.src === 'suggested' ? [...s.channels.v] : [...s.channels.v]
        if (s.channels.src === 'suggested' && v.includes(val)) { s.channels = { v, src: 'user' }; return } // لمسُ المقترح يؤكّده
        v = v.includes(val) ? v.filter((x) => x !== val) : [...v.filter((x) => (val === D.UNKNOWN ? false : x !== D.UNKNOWN)), val]
        s.channels = { v, src: 'user' }
      } else if (field === 'reasons') {
        const v = s.friction.reasons
        s.friction.reasons = v.includes(val) ? v.filter((x) => x !== val) : [...v.filter((x) => (val === D.UNKNOWN ? false : x !== D.UNKNOWN)), val]
      } else {
        const v = s[field]
        s[field] = v.includes(val) ? v.filter((x) => x !== val) : [...v.filter((x) => (val === D.UNKNOWN ? false : x !== D.UNKNOWN)), val]
      }
    })
  },
  apply(id, field) {
    const t = curTask(); const act = C.activeStages(t); const i = act.findIndex((s) => s.id === id)
    const src = act[i]
    update(() => { for (const s of act.slice(i + 1)) { s[field] = { v: Array.isArray(src[field].v) ? [...src[field].v] : src[field].v, src: 'user' } } })
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
  doc(id, field, d) {
    const s = stageOf(curTask(), id)
    update(() => { s[field] = s[field].includes(d) ? s[field].filter((x) => x !== d) : [...s[field], d] })
  },
  'doc-new'(id, field) { ui.docPick = { sid: id, field, text: '' }; render(); $('[data-in="doc"]')?.focus() },
  'doc-save'() {
    const p = ui.docPick; const name = p.text.trim(); ui.docPick = null
    if (!name) return render()
    const s = stageOf(curTask(), p.sid)
    update(() => { if (!s[p.field].includes(name)) s[p.field].push(name) })
  },
  move(id, dir) { moveStage(id, Number(dir)) },
  merge(id) { mergeNext(id) },
  del(id) { removeStage(id) },
  'dec-add'(id) {
    const d = { id: newId('d'), after: id, q: 'تُعتمد، أم تُعاد للتعديل؟', back: null, out: '', common: null }
    update(() => { curTask().decisions.push(d) })
    ui.sheet = d.id; render()
  },
  'dec-open'(id) { ui.sheet = id; render() },
  'dec-back'(id, sid) { update(() => { curTask().decisions.find((d) => d.id === id).back = sid || null }) },
  'dec-c'(id, v) { update(() => { const d = curTask().decisions.find((x) => x.id === id); d.common = d.common === v ? null : v }) },
  'dec-del'(id) { update(() => { const t = curTask(); t.decisions = t.decisions.filter((d) => d.id !== id) }); ui.sheet = null; toast('حُذفت نقطة القرار', true); render() },
  'hint-add'(i) {
    const t = curTask(); const h = D.MISSING_HINTS[i]; const act = C.activeStages(t)
    const st = makeStage(h.name, { status: 'yes', actor: h.actor })
    let at = t.stages.length
    if (h.afterFirst && act[0]) at = t.stages.indexOf(act[0]) + 1
    else if (h.before) { const target = act.find((s) => h.before.test(s.name)); if (target) at = t.stages.indexOf(target) }
    update(() => { t.stages.splice(at, 0, st); t.dismissed = [...(t.dismissed || []), Number(i)] })
    ui.grown = st.id
  },
  'hint-no'(i) { update(() => { const t = curTask(); t.dismissed = [...(t.dismissed || []), Number(i)] }) },
  'to-props'() {
    update((s) => { for (const st of curTask().stages) if (st.status === 'pending') st.status = 'yes'; s.screen = 'props' })
    ui.sheet = null
    ACTIONS.walk()
  },
  'to-task'() { ui.sheet = null; go('task'); scrollTo(0, 0) },
  'to-reflect'() { ui.mode = 'now'; go('reflect'); scrollTo(0, 0) },
  'to-final'() { go('final'); scrollTo(0, 0) },
  back(screen) { ui.sheet = null; go(screen); scrollTo(0, 0) },
  g(field, val) { update(() => { const g = curTask().global; g[field] = g[field] === val ? null : val }) },
  gt(field, val) {
    update(() => {
      const g = curTask().global; const v = g[field]
      g[field] = v.includes(val) ? v.filter((x) => x !== val) : [...v.filter((x) => (val === D.UNKNOWN ? false : x !== D.UNKNOWN)), val]
    })
  },
  mode(m) {
    ui.mode = m
    const track = $('#track')
    // التحوّلُ حركةٌ على الخريطة نفسِها لا إعادةُ رسمٍ لها
    if (track) { track.classList.toggle('after', m === 'after'); [120, 400, 750].forEach((ms) => setTimeout(drawArrows, ms)) }
    const keep = $('#track-wrap')?.scrollLeft
    setTimeout(() => { render(); if ($('#track-wrap') && keep != null) $('#track-wrap').scrollLeft = keep }, 720)
    document.querySelectorAll('[data-a^="mode:"]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.a === 'mode:' + m))
  },
  journey(d) { ui.docPick = { journey: d }; render() },
  finish() { update(() => { curTask().completed = true }); scrollTo(0, 0) },
  print() { window.print() },
  book() {
    if (BOOKING_URL) return window.open(BOOKING_URL, '_blank', 'noopener')
    ui.booked = true
    update((s) => { s.bookingRequested = new Date().toISOString() }, { undoable: false })
  },
  another() { ui.search = ''; update((s) => { s.cur = null; s.screen = 'pick' }, { undoable: false }); scrollTo(0, 0) },
  async share() {
    const url = location.href
    try {
      if (navigator.share) await navigator.share({ title: 'رسم سير العمل', text: 'ارسم مهمةً من عملنا مرحلةً مرحلة', url })
      else { await navigator.clipboard.writeText(url); ui.shared = true; render() }
    } catch { /* أغلق العميلُ نافذة المشاركة */ }
  },
}

function setStatus(id, v) {
  const t = curTask(); const s = stageOf(t, id)
  update(() => { s.status = s.status === v && v !== 'no' ? 'pending' : v })
  if (v === 'no') toast(`طُويت «${s.name}»، ويمكن استرجاعها`, true)
  if (v === 'sometimes' && ui.sheet !== id) openStage(id)
}

function guidedStep(skip) {
  const g = ui.guided
  if (skip) g.answers[g.i] = ''
  if (g.i < D.PROMPTS.length - 1) { g.i++; return render() }
  const t = curTask()
  const extra = g.answers.map((a, i) => (a && a.trim() ? `${D.PROMPTS[i]} ${a.trim()}` : '')).filter(Boolean).join('\n')
  update(() => { t.story = [t.story, extra].filter((x) => x && x.trim()).join('\n') })
  ui.guided = null
  fromStory()
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

let inputSnap = null
document.addEventListener('focusin', (e) => { if (e.target.dataset?.in) inputSnap = null })
document.addEventListener('input', (e) => {
  const key = e.target.dataset?.in
  if (!key) return
  const v = e.target.value
  const [k, id] = key.split(':')
  const t = curTask()
  if (k === 'search') { ui.search = v; return render() }
  if (k === 'role') { ui.roleDraft = v; return }
  if (k === 'doc') { ui.docPick.text = v; return }
  if (k === 'guided') { ui.guided.answers[ui.guided.i] = v; return }
  // الكتابةُ تُحفظ مع كل حرف، ولقطةُ التراجع مرّةً لكل حقل
  const first = inputSnap !== key
  inputSnap = key
  update((s) => {
    if (k === 'story') t.story = v
    else if (k === 'name') { const st = stageOf(t, id); st.name = v || st.name; st.guide = false; if (!v) st.name = '' }
    else if (k === 'cond') stageOf(t, id).condition = v
    else if (k === 'note') stageOf(t, id).note = v
    else if (k === 'dq') t.decisions.find((d) => d.id === id).q = v
    else if (k === 'dout') t.decisions.find((d) => d.id === id).out = v
    else if (k === 'lastQ') t.lastQ = v
    else if (k === 'systems') t.systems = v
    else if (['freqNum', 'seasonWhen', 'team', 'exitOther'].includes(k)) t.global[k] = v
  }, { undoable: first, render: false })
  if (k === 'story') { const c = $('.count'); if (c) c.textContent = `${n(words(v))} كلمة` }
  if (k === 'name' || k === 'cond' || k === 'dq' || k === 'dout') {
    // تحديثُ البطاقة دون إعادة رسم اللوحة (حتى لا يضيع المؤشّر)
    const main = $('#main'); const keep = $('#track-wrap')?.scrollLeft
    main.innerHTML = SCREENS[state.screen]()
    if ($('#track-wrap') && keep != null) $('#track-wrap').scrollLeft = keep
    requestAnimationFrame(drawArrows)
  }
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (ui.example) { ui.example = false; render() } else if (ui.sheet) { ui.sheet = null; render() } }
  if (e.key === 'Enter' && e.target.dataset?.in === 'role') ACTIONS['role-save'](ui.sheet)
  if (e.key === 'Enter' && e.target.dataset?.in === 'doc') ACTIONS['doc-save']()
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.target.closest('input,textarea')) { e.preventDefault(); ACTIONS.undo() }
})
$('#scrim').addEventListener('click', () => { ui.sheet = null; render() })

// ── السحبُ لتغيير الترتيب (ومعه بديلٌ بالأزرار في لوحة الخصائص)
document.addEventListener('pointerdown', (e) => {
  const grip = e.target.closest('[data-grip]')
  if (!grip) return
  e.preventDefault()
  const card = grip.closest('.card')
  const track = $('#track')
  const horizontal = getComputedStyle(track).flexDirection === 'row'
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
  d.card.style.zIndex = 5
})
document.addEventListener('pointerup', (e) => {
  const d = ui.drag
  if (!d) return
  ui.drag = null
  d.card.style.transform = ''
  d.card.classList.remove('dragging')
  if (!ui.dragMoved) { setTimeout(() => (ui.dragMoved = false)); return openStage(d.id) }
  const t = curTask()
  const cards = [...document.querySelectorAll('#track .card, #track .folded')].filter((c) => c.dataset.sid !== d.id)
  const pos = d.horizontal ? e.clientX : e.clientY
  let index = cards.length
  for (let i = 0; i < cards.length; i++) {
    const r = cards[i].getBoundingClientRect()
    const mid = d.horizontal ? r.left + r.width / 2 : r.top + r.height / 2
    // في الحاسوب يجري المسارُ من اليمين: ما كان يمين المؤشّر قبله
    const before = d.horizontal ? pos > mid : pos < mid
    if (before) { index = i; break }
  }
  const ids = cards.map((c) => c.dataset.sid)
  const targetId = ids[index]
  update(() => {
    const from = t.stages.findIndex((s) => s.id === d.id)
    const [s] = t.stages.splice(from, 1)
    const to = targetId ? t.stages.findIndex((x) => x.id === targetId) : t.stages.length
    t.stages.splice(to, 0, s)
  })
  setTimeout(() => (ui.dragMoved = false))
})

addEventListener('resize', () => requestAnimationFrame(drawArrows))
onChange(render)
render()
