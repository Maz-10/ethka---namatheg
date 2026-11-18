// اختبارُ حارسَي الخادم: التحقق من ناتج النموذج، وحذفُ الحساس.  التشغيل: node --test سير-العمل/test/
import test from 'node:test'
import assert from 'node:assert/strict'
import { validate, ShapeError } from '../server/arrange/schema.mjs'
import { redact } from '../server/redact.mjs'

const STORY = 'يجينا التبليغ عن طريق ناجز، والمساعد يسجله في ملف الإكسل. بعدين المدير يوقّع، وهذا لحاله ياخذ أيام.'
const stage = (o) => ({ id: 's1', name: 'توقيع المدير', ...o })

test('خللُ البنية يُرمى ليُعاد الطلب', () => {
  assert.throws(() => validate('ليس JSON', STORY), ShapeError)
  assert.throws(() => validate({ stages: [{ name: '' }] }, STORY), ShapeError)
})

test('المذكورُ بلا شاهدٍ من كلام العميل يصير غير محدد', () => {
  const r = validate({ stages: [stage({
    wait_time: { value: '1to3', confidence: 'stated', evidence: 'وهذا لحاله ياخذ أيام' },
    work_time: { value: 'day', confidence: 'stated', evidence: 'يعمل عليها يومًا كاملًا' },
  })] }, STORY)
  assert.equal(r.stages[0].wait_time.value, '1to3')
  assert.equal(r.stages[0].work_time.confidence, 'unknown')
  assert.equal(r.stages[0].work_time.value, null)
})

test('القيمةُ خارج الخيارات المعتمدة لا تُقبل، والمقترحُ يبقى مقترحًا بلا شاهد', () => {
  const r = validate({ stages: [stage({
    channels: { value: ['email', 'fax'], confidence: 'suggested', evidence: 'x' },
    wait_time: { value: 'month', confidence: 'stated', evidence: 'ياخذ أيام' },
  })] }, STORY)
  assert.deepEqual(r.stages[0].channels.value, ['email'])
  assert.equal(r.stages[0].channels.evidence, null)
  assert.equal(r.stages[0].wait_time.value, null)
})

test('أسئلة التوضيح ثلاثة على الأكثر، ولمراحل موجودة', () => {
  const q = (t) => ({ question: 'سؤال؟', options: ['أ'], target: t })
  const r = validate({ stages: [stage({})], clarifications: [q('s1.actor'), q('s9.actor'), q('s1.wait_time'), q('s1.work_time'), q('s1.friction')] }, STORY)
  assert.equal(r.clarifications.length, 3)
  assert.ok(r.clarifications.every((c) => c.target.startsWith('s1.')))
})

test('حذفُ الحساس: الأسماء والأرقام والخصوم، لا الأدوار', () => {
  assert.equal(redact('عند الأستاذ خالد بن سعد').text, 'عند الأستاذ [اسم]')
  assert.equal(redact('القضية رقم ٤٤٥٦٧٨').text, 'القضية رقم [رقم]')
  assert.equal(redact('تواصل على 0551234567').text, 'تواصل على [رقم]')
  assert.equal(redact('يطلب المحامي المستندات').text, 'يطلب المحامي المستندات')
  assert.equal(redact('عندنا ١٢ قضية في الشهر').text, 'عندنا ١٢ قضية في الشهر')
  assert.deepEqual(redact('دعوى ضد النخبة للتجارة').types, ['party_name'])
})
