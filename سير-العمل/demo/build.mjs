// ═══ بناءُ نسخة العرض — صفحةٌ ساكنة للتحقق، بخادمٍ محاكًى في المتصفح ═══
//   node سير-العمل/demo/build.mjs <مجلد الإخراج>
// تُنسخ الصفحة ولوحة الفريق كما هما، وتُضاف إليهما محاكاةُ الخادم (`shim.js`) وشريطٌ يعرّف بالنسخة،
// وتصير المسارات نسبية، وتُضمَّن الخطوط في ملف الأنماط.

import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = process.argv[2]
if (!OUT) throw new Error('حدّد مجلد الإخراج')
mkdirSync(join(OUT, 'css'), { recursive: true })
mkdirSync(join(OUT, 'server/arrange/providers'), { recursive: true })
cpSync(join(SRC, 'js'), join(OUT, 'js'), { recursive: true })
for (const f of ['server/redact.mjs', 'server/arrange/schema.mjs', 'server/arrange/providers/fixture.mjs']) cpSync(join(SRC, f), join(OUT, f))
cpSync(join(SRC, 'demo/shim.js'), join(OUT, 'js/demo-shim.js'))

let css = readFileSync(join(SRC, 'css/app.css'), 'utf8').replace(/url\('\.\.\/fonts\/([^']+)'\)/g, (_, f) =>
  `url('data:font/woff2;base64,${readFileSync(join(SRC, 'fonts', f)).toString('base64')}')`)
css += `
.demo-bar { background: var(--night); color: var(--pearl); font-size: .875rem; padding: 10px 16px; display: flex; flex-wrap: wrap; gap: 6px 18px; align-items: center; }
.demo-bar b { color: var(--gold-night); font-weight: 500; }
.demo-bar a, .demo-bar button { color: var(--gold-night); background: none; border: 0; padding: 0; min-height: 32px; text-decoration: underline; text-underline-offset: 4px; font-size: .875rem; }
.demo-bar .sp { flex: 1; }
`
writeFileSync(join(OUT, 'css/app.css'), css)
cpSync(join(SRC, 'css/team.css'), join(OUT, 'css/team.css'))

const bar = (here) => `<div class="demo-bar" role="note"><b>نسخة للتحقق</b><span>لا خادم هنا، فيُحاكى في متصفحك وتبقى البيانات فيه.</span><span class="sp"></span>${here === 'client' ? '<a href="team.html">لوحة الفريق</a>' : '<a href="index.html">صفحة العميل</a>'}<button type="button" onclick="try{Object.keys(localStorage).filter(function(k){return k.indexOf('ethka')===0}).forEach(function(k){localStorage.removeItem(k)})}catch(e){};location.hash='';location.reload()">امحُ بيانات العرض</button></div>`
for (const [file, here] of [['index.html', 'client'], ['team.html', 'team']]) {
  let html = readFileSync(join(SRC, file), 'utf8')
    .replace(/(href|src)="\/(css|js|fonts)\//g, '$1="$2/')
    .replace(/\s*<link rel="preload"[^>]+>/g, '')
    .replace('<body', `<body`).replace(/<body([^>]*)>/, `<body$1>\n  ${bar(here)}`)
    .replace(/(\s*<script type="module")/, `\n  <script src="js/demo-shim.js"></script>$1`)
    .replace('</title>', ' (نسخة للتحقق)</title>')
  writeFileSync(join(OUT, file), html)
}
console.log('نسخة العرض في', OUT)
