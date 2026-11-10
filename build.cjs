/* بطاقة الدعوة — «المجمع الساكن»
 * الهندسة كلها محسوبة هنا؛ والنص يُرسم بمحرّك Chromium (تشكيل عربي سليم)، والمخرج PDF متجهيّ (روابطه فاعلة) وPNG. */
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const OUT = path.join(__dirname, 'dist')
const FONTS = path.join(__dirname, 'assets/fonts') + '/'
const TH = FONTS
const LOGO = fs.readFileSync(path.join(__dirname, 'assets/logo-paths.tsx'), 'utf8')
const pathOf = (name) => LOGO.match(new RegExp('const ' + name + " = '([^']+)'"))[1]
const D_DIAMOND = pathOf('D_DIAMOND'), D_DOTS = pathOf('D_DOTS'), D_NAME = pathOf('D_NAME'), D_NAME_GOLD = pathOf('D_NAME_GOLD')
// مركز المعيّن في فضاء الشعار وقطرُه
const MC = { x: 3285.5, y: -523.5, d: 403 }

const MAP = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('DoubleTree by Hilton Riyadh Financial District')

/* ── الوحدة: ٠٫١ مم — الصفحة A5 ‏١٤٨٠×٢١٠٠ ── */
const W = 1480, H = 2100
const C = {
  paper: '#F3EEE3', ink: '#1E2329', ink2: '#4E5560', ink3: '#7D828A',
  gold: '#A9853F', goldDeep: '#7E6029', goldHi: '#D9BE7C', hair: '#1E2329',
}
const O = { x: 740, y: 890 }     // الأصل: مركز الأقواس
const f = (n) => +n.toFixed(2)


/* ── الرمزُ والشعار كما يرسمهما الموقع حرفًا: الحبرُ ‎--ink والذهبُ ‎--accent (السمة الفاتحة) ── */
const SITE = { ink: '#232830', accent: '#A9853F' }
const GEMS = `<path d="${D_DOTS}" fill="${SITE.ink}"/><path d="${D_DIAMOND}" fill="${SITE.accent}"/>`
const LOCKUP = { x: 18, y: -976, w: 3701, h: 1307 }
const LOGO_SVG = (wmm) => `<svg viewBox="${LOCKUP.x} ${LOCKUP.y} ${LOCKUP.w} ${LOCKUP.h}" style="display:block;width:${wmm}mm;height:${f(wmm * LOCKUP.h / LOCKUP.w)}mm" role="img" aria-label="إذكاء">
  <path d="${D_NAME}" fill="${SITE.ink}"/><path d="${D_DOTS}" fill="${SITE.ink}"/>
  <path d="${D_NAME_GOLD}" fill="${SITE.accent}"/><path d="${D_DIAMOND}" fill="${SITE.accent}"/></svg>`

/* ── المدرّج: طبقتان يفصلهما ممشى، وممرّاتٌ نصف قطريّة متعاقبة ── */
const EM = 62 // قطرُ المعيّن الذهبيّ في الأصل
const EMC = { x: 3285.5, y: (-725 + -29) / 2 } // مركزُ صندوق الرمز — يقع على الأصل فيشطره خطُّ الأساس
const R0 = 158, DR = 24, ROWS = 17, DIAZOMA = 8
const SEAT = 7.4, STEP = 22.5
const lowerAisles = [30, 60, 90, 120, 150]
const upperAisles = [15, 45, 75, 105, 135, 165]
const LIT = { row: 1, theta: 77 } // مقعدُه: الصفُّ الثاني، قريبًا من المنصّة

const seats = []
let lit = null
for (let i = 0; i < ROWS; i++) {
  if (i === DIAZOMA) continue
  const r = R0 + i * DR
  const aisles = i < DIAZOMA ? lowerAisles : upperAisles
  const gap = (20 / r) * (180 / Math.PI) // عرضُ الممرّ بالدرجات
  const edges = [0, ...aisles, 180]
  for (let w = 0; w < edges.length - 1; w++) {
    const a1 = edges[w] + (w === 0 ? 2.2 * (180 / r) / 3.14 : gap / 2)
    const a2 = edges[w + 1] - (w === edges.length - 2 ? 2.2 * (180 / r) / 3.14 : gap / 2)
    const arc = ((a2 - a1) * Math.PI / 180) * r
    const k = Math.max(1, Math.round(arc / STEP))
    for (let j = 0; j < k; j++) {
      const th = a1 + (a2 - a1) * (j + 0.5) / k
      const t = th * Math.PI / 180
      const s = { x: O.x + r * Math.cos(t), y: O.y - r * Math.sin(t), th, i }
      seats.push(s)
      if (i === LIT.row && (!lit || Math.abs(th - LIT.theta) < Math.abs(lit.th - LIT.theta))) lit = s
    }
  }
}

const diamondAt = (x, y, d, rot = 0) =>
  `<path d="${D_DIAMOND}" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(d / MC.d * 1000) / 1000}) translate(${-MC.x} ${-MC.y})"/>`

// الكثافة تخفت مع البعد كطبقاتِ ضوءٍ تبتعد
const seatSvg = seats.map((s) => {
  if (s === lit) return ''
  const k = s.i / (ROWS - 1)
  const op = f(0.27 - 0.11 * k) // الأماكنُ كلُّها باهتة — إلا مكانَه
  return `<g opacity="${op}">${diamondAt(s.x, s.y, SEAT)}</g>`
}).join('')

/* ── المقياس: قوسٌ شعريّ بعلامات كلّ ٥° و١٥° ── */
const RS = R0 + (ROWS - 1) * DR + 38
let scale = `<path d="M ${f(O.x - RS)} ${O.y} A ${RS} ${RS} 0 0 1 ${f(O.x + RS)} ${O.y}" fill="none"/>`
for (let a = 0; a <= 180; a += 5) {
  const t = a * Math.PI / 180, len = a % 45 === 0 ? 20 : a % 15 === 0 ? 12 : 6
  scale += `<line x1="${f(O.x + RS * Math.cos(t))}" y1="${f(O.y - RS * Math.sin(t))}" x2="${f(O.x + (RS + len) * Math.cos(t))}" y2="${f(O.y - (RS + len) * Math.sin(t))}"/>`
}

/* ── أرقامُ الصفوف تحت خطّ الأساس، على الجهتين ── */
const rowNums = []
let rn = 0
for (let i = 0; i < ROWS; i++) {
  if (i === DIAZOMA) continue
  rn++
  if (rn % 2 === 0) continue
  const r = R0 + i * DR
  for (const sgn of [-1, 1]) rowNums.push({ x: O.x + sgn * r, n: String(rn).padStart(2, '0') })
}

const AR = (s) => String(s).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

const STAGE = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'assets/venue-logo.png')).toString('base64')
const NAME = process.env.NAME || ''
const TOKEN = process.env.TOKEN || ''
// النموذجُ بلا اسم: يُوجَّه ردُّه إلى نافذة التسجيل في صفحة اللقاء؛ والبطاقةُ الشخصيّة إلى مفتاح صاحبها
const RSVP_YES = TOKEN ? 'https://ethka.sa/rsvp/' + TOKEN + '?a=yes' : 'https://ethka.sa/community/liqa-1/#التسجيل'
const RSVP_NO = TOKEN ? 'https://ethka.sa/rsvp/' + TOKEN + '?a=no' : 'https://ethka.sa/community/liqa-1/'
const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:Th;src:url('${TH}thmanyahserifdisplay-Light.otf');font-weight:300}
@font-face{font-family:Th;src:url('${TH}thmanyahserifdisplay-Regular.otf');font-weight:400}
@font-face{font-family:Th;src:url('${TH}thmanyahserifdisplay-Medium.otf');font-weight:500}
@font-face{font-family:Th;src:url('${TH}thmanyahserifdisplay-Bold.otf');font-weight:700}
@font-face{font-family:Jura;src:url('${FONTS}Jura-Light.ttf');font-weight:300}
@font-face{font-family:Ital;src:url('${FONTS}Italiana-Regular.ttf')}
@page{size:148mm 210mm;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:148mm;height:210mm;background:${C.paper}}
.page{position:relative;width:148mm;height:210mm;overflow:hidden;background:${C.paper};color:${C.ink};font-family:Th;-webkit-font-smoothing:antialiased}
svg.art{position:absolute;inset:0;width:100%;height:100%}
.t{position:absolute;left:0;right:0;text-align:center;white-space:nowrap}
.u{--u:0.1mm}
.lat{font-family:Jura;font-weight:300;direction:ltr;unicode-bidi:isolate;letter-spacing:.32em}
a{color:inherit;text-decoration:none}
</style></head><body><div class="page">
<svg class="art" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
  </defs>

  <!-- الحقل -->
  <g fill="${C.ink}">${seatSvg}</g>

  <!-- المحور والمقياس وخطّ الأساس والأوركسترا -->
  <g stroke="${C.hair}" stroke-width="1.1" fill="none" opacity=".55">
    <line x1="${O.x}" y1="${O.y - 92}" x2="${O.x}" y2="${O.y - RS - 34}" stroke-dasharray="2 7"/>
    ${scale}
  </g>
  <g stroke="${C.hair}" stroke-width="1.1" fill="none" opacity=".7">
    <line x1="130" y1="${O.y}" x2="${O.x - 112}" y2="${O.y}"/>
    <line x1="${O.x + 112}" y1="${O.y}" x2="${W - 130}" y2="${O.y}"/>
  </g>
  <circle cx="${O.x}" cy="${O.y}" r="104" fill="none" stroke="${C.gold}" stroke-width="1.1" opacity=".85"/>

  <!-- الأصل: الرمزُ بنقاطه الثلاث من ملف الهوية نفسِه — الذهبيُّ في المركز، والعقلان تحته -->
  <g transform="translate(${O.x} ${O.y}) scale(${f(EM / MC.d * 1000) / 1000}) translate(${-EMC.x} ${-EMC.y})">
    ${GEMS}
  </g>

  <!-- المقعد المضاء -->
  <g fill="${SITE.accent}">${diamondAt(lit.x, lit.y, SEAT * 1.5)}</g>
  <circle cx="${f(lit.x)}" cy="${f(lit.y)}" r="15.5" fill="none" stroke="${C.gold}" stroke-width="1.05"/>

  <!-- أرقام الصفوف -->
  <g font-family="Jura" font-weight="300" font-size="11.5" fill="${C.ink3}" text-anchor="middle" letter-spacing="0.5">
    ${rowNums.map((n) => `<text x="${f(n.x)}" y="${O.y + 30}">${n.n}</text>`).join('')}
  </g>
</svg>

<!-- الترويسة: شعارُ الموقع يمينًا، و«دعوة» يسارًا على خطّه -->
<div style="position:absolute;top:10.2mm;right:13mm">${LOGO_SVG(25)}</div>
<div class="t" style="top:19.6mm;right:13mm;left:auto;text-align:right;font-weight:300;font-size:6.6pt;color:${C.ink3}">مجتمعٌ يُعنى بالتقنيات القانونيّة.</div>
<div class="t" style="top:12.45mm;left:13mm;right:auto;text-align:left;font-weight:300;font-size:11pt;line-height:1.5;color:${C.ink}">دعوة</div>

<!-- المدعوّ -->
<div class="t" style="top:110.5mm;font-weight:300;font-size:8pt;color:${C.ink3}">المكرّم</div>
<div class="t" style="top:115.5mm;font-weight:300;font-size:26pt;line-height:1.5;color:${C.ink}${NAME ? '' : ';color:' + C.ink3 + '99'}">${NAME || 'اسم المدعوّ'}</div>

<div class="t" style="top:135mm;font-weight:300;font-size:9.2pt;color:${C.ink2}">يتشرّف مجتمعُ إذكاء بدعوتكم لحضور</div>
<div class="t" style="top:141.5mm;font-weight:500;font-size:19pt;line-height:1.5;color:${C.goldDeep}">اللقاء الافتتاحيّ</div>

<div style="position:absolute;top:155.1mm;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:1.6mm;direction:rtl"><svg viewBox="2852 -725 867 696" style="display:block;height:3.6mm;width:${f(3.6*867/696)}mm;margin-left:.6mm"><path d="${D_DOTS}" fill="${SITE.ink}"/><path d="${D_DIAMOND}" fill="${SITE.accent}"/></svg>
  <span style="font-weight:400;font-size:12.5pt;line-height:1;color:${C.ink};transform:translateY(-.35mm)">مجتمع</span><svg viewBox="18 -976 2700 1307" style="display:block;height:5.3mm;width:${f(5.3*2700/1307)}mm" aria-label="إذكاء"><path d="${D_NAME}" fill="${SITE.ink}"/><path d="${D_NAME_GOLD}" fill="${SITE.accent}"/></svg></div>
<div class="t" style="top:161.7mm;font-weight:300;font-size:8.6pt;color:${C.ink2}">مجتمعٌ يَجمَع المهتمّين بمُلتقى القانون والتقنية.</div>
<!-- السجلّ -->
<div style="position:absolute;top:170.5mm;left:13mm;right:13mm;height:25mm;border-top:.11mm solid ${C.ink}80;border-bottom:.11mm solid ${C.ink}80;display:grid;grid-template-columns:1fr 1.45fr 1fr 1.25fr;direction:rtl">
  ${[
    ['اليوم', 'الأحد', ''],
    ['التاريخ', '١٥ نوفمبر ٢٠٢٦', '٥ جمادى الآخرة ١٤٤٨ هـ'],
    ['الوقت', '٧:٠٠ مساءً', ''],
    ['المكان', 'STAGE', ''],
  ].map(([k, v, s], i) => `
    <${i === 3 ? `a href="${MAP}"` : 'div'} style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:2.6mm 0 2.6mm;${i ? `border-right:.11mm solid ${C.ink}2e;` : ''}">
      <span style="font-weight:300;font-size:6.4pt;color:${C.ink3}">${k}</span>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center">
      ${v === 'STAGE' ? `<img src="${STAGE}" style="margin-top:.6mm;height:7.4mm" alt="دبل تري — المركز المالي">` : `<span style="font-weight:400;font-size:10.5pt;color:${C.ink};">${v}</span>`}
      ${i === 3 ? `<span style="margin-top:.7mm;font-weight:400;font-size:7.4pt;color:${C.ink}">المركز المالي</span><span style="margin-top:.6mm;font-weight:400;font-size:6.2pt;color:${C.goldDeep};border-bottom:.13mm solid ${C.gold};padding-bottom:.3mm">افتح الخريطة ↖</span>` : ''}
      ${s ? `<span style="margin-top:.4mm;font-weight:300;font-size:6.4pt;color:${C.ink3}">${s}</span>` : ''}
      </div>
    </${i === 3 ? 'a' : 'div'}>`).join('')}
</div>

<!-- الذيل -->
<!-- الردّ: رابطان باسم المدعوّ وحده -->
<div style="position:absolute;top:197.4mm;left:0;right:0;display:flex;justify-content:center;gap:3mm;direction:rtl">
  <a href="${RSVP_YES}" style="display:inline-flex;align-items:center;justify-content:center;width:34mm;height:6.6mm;border-radius:99mm;background:${C.goldDeep};color:#FBF7EE;font-weight:500;font-size:8.6pt">تأكيد الحضور</a>
  <a href="${RSVP_NO}" style="display:inline-flex;align-items:center;justify-content:center;width:34mm;height:6.6mm;border-radius:99mm;border:.18mm solid ${C.ink}66;color:${C.ink};font-weight:400;font-size:8.6pt">الاعتذار</a>
</div>
</div></body></html>`

fs.writeFileSync(path.join(OUT, 'card.html'), html)

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 560, height: 794 }, deviceScaleFactor: 4 })
  await p.goto('file://' + path.join(OUT, 'card.html'))
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(300)
  await p.pdf({ path: path.join(OUT, (process.env.OUTNAME || 'card') + '.pdf'), width: '148mm', height: '210mm', printBackground: true, preferCSSPageSize: true })
  await p.screenshot({ path: path.join(OUT, (process.env.OUTNAME || 'card') + '.png'), clip: { x: 0, y: 0, width: 559.37, height: 793.7 } })
  await b.close()
  console.log('seats', seats.length, 'lit', lit && f(lit.th))
})()
