// ═══ الترتيب الذكي والتفريغ الصوتي — واجهةُ المزوّد ═══
// اختيارُ مزوّد النموذج والتفريغ قرارٌ مفتوح (موضعُ معالجة البيانات ونظامُ حماية البيانات الشخصية)،
// فلا مزوّدَ موصولٌ هنا. يُختار بمتغيّر البيئة:
//   ARRANGE_PROVIDER=none     (الافتراض) لا ترتيب؛ تعرض الصفحةُ أقربَ قالب، وكلامُ العميل محفوظ
//   ARRANGE_PROVIDER=fixture  للتطوير والاختبار وحدهما: ناتجٌ ثابت لمثال المواصفات
// وإضافةُ مزوّدٍ حقيقي = ملفٌّ واحد في `providers/` يصدّر `complete({ system, user })` ويُرجع نصَّ JSON.
// والتفريغ كذلك: TRANSCRIBE_PROVIDER، وملفٌّ يصدّر `transcribe(buffer, mime)` ويُرجع النص.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { validate, ShapeError } from './schema.mjs'
import { redact } from '../redact.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const SYSTEM = readFileSync(join(HERE, 'prompt.md'), 'utf8')
const A = process.env.ARRANGE_PROVIDER || 'none'
const T = process.env.TRANSCRIBE_PROVIDER || 'none'
const TIMEOUT = 18000

const load = async (name) => (name === 'none' ? null : import(`./providers/${name}.mjs`))
const arrangeP = load(A)
const transcribeP = load(T)

export const capabilities = () => ({ arrange: A !== 'none', transcribe: T !== 'none' })

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])

/** يرتّب الحكاية. يُرجع { result } أو { result: null, reason } — ولا يرمي. */
export async function arrange({ story, dept, template, insert, context }) {
  const provider = await arrangeP
  if (!provider) return { result: null, reason: 'unavailable' }
  // يُحذف الحساسُ قبل أن يغادر الكلامُ الخادم
  const clean = redact(String(story || '').slice(0, 8000)).text
  const user = [
    `الإدارة: ${dept === 'legal' ? 'الإدارة القانونية' : 'إدارة أخرى'}`,
    template ? `القالب الأقرب مرجعًا لا قيدًا:\n${template.stages.map((s, i) => `${i + 1}. ${s.name}`).join('\n')}` : '',
    insert ? `هذه مراحل تُضاف إلى مسارٍ قائم مراحلُه: ${(context || []).join('، ')}. رتّب الكلام الجديد وحده.` : '',
    `كلام العميل:\n«${clean}»`,
  ].filter(Boolean).join('\n\n')
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await withTimeout(provider.complete({ system: SYSTEM, user, story: clean }), TIMEOUT)
      return { result: validate(raw, clean) }
    } catch (e) {
      if (!(e instanceof ShapeError) || attempt === 1) return { result: null, reason: e instanceof ShapeError ? 'shape' : 'error' }
    }
  }
  return { result: null, reason: 'error' }
}

export async function transcribe(buf, mime) {
  const provider = await transcribeP
  if (!provider) return null
  return withTimeout(provider.transcribe(buf, mime), 60000)
}
