// اختبارُ الحساب: يطابق جدول القيم في المواصفات (المحور الثاني).  التشغيل: node --test سير-العمل/test
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeNumbers, range, approxDays, handoffs, transform, monthlyTimes } from '../js/calc.js'

const st = (id, actor, work, wait, extra = {}) => ({
  id, name: extra.name || id, status: extra.status || 'yes', actor: { v: actor }, channels: { v: extra.channels || [] },
  work: { v: work }, wait: { v: wait }, friction: { v: 'none', reasons: [] }, constraints: extra.constraints || [], docsIn: [], docsOut: [],
})

test('قيم التكرار', () => {
  assert.equal(monthlyTimes({ freq: 'lt5' }), 3)
  assert.equal(monthlyTimes({ freq: '5to20' }), 12)
  assert.equal(monthlyTimes({ freq: '20to50' }), 35)
  assert.equal(monthlyTimes({ freq: '50to100' }), 75)
  assert.equal(monthlyTimes({ freq: 'gt100' }), 120)
  assert.equal(monthlyTimes({ freq: 'gt100', freqNum: '180' }), 180)
  assert.equal(monthlyTimes({ freq: 'unknown' }), null)
})

test('ساعات العمل الشهرية وزمن الدورة ونسبة العمل الفعلي', () => {
  const task = {
    stages: [st('a', 'lawyer', 'day', 'none'), st('b', 'head', '1to3', 'week'), st('c', 'lawyer', 'half', '1to3')],
    decisions: [], global: { freq: '5to20' },
  }
  const N = computeNumbers(task)
  assert.equal(N.workHours, 8 + 2 + 4)              // ١٤ ساعة للمرة
  assert.equal(N.monthlyHours, 12 * 14)             // ١٦٨
  assert.equal(N.cycleDays, 14 / 8 + 5 + 2)         // ٨٫٧٥ يوم عمل
  assert.ok(Math.abs(N.ratio - (14 / 8) / 8.75) < 1e-9)
})

test('المشروطة بنصف وزنها، والمطويّة لا تُحسب', () => {
  const task = {
    stages: [st('a', 'lawyer', 'day', 'none'), st('b', 'head', 'day', 'week', { status: 'sometimes' }), st('c', 'x', 'gt1', 'gtweek', { status: 'no' })],
    decisions: [], global: { freq: 'lt5' },
  }
  const N = computeNumbers(task)
  assert.equal(N.workHours, 8 + 4)
  assert.equal(N.waitDays, 2.5)
})

test('الرجوع الشائع يُضاف مرة واحدة، والنادر لا يُضاف', () => {
  const stages = [st('a', 'lawyer', '1to3', 'none'), st('b', 'lawyer', 'day', 'none'), st('c', 'head', 'lt1', '1to3'), st('d', 'lawyer', 'lt1', 'none')]
  const common = computeNumbers({ stages, decisions: [{ after: 'c', back: 'b', common: 'common' }], global: {} })
  const rare = computeNumbers({ stages, decisions: [{ after: 'c', back: 'b', common: 'rare' }], global: {} })
  assert.equal(rare.workHours, 2 + 8 + 0.5 + 0.5)
  assert.equal(common.workHours, rare.workHours + 8 + 0.5)
  assert.equal(common.waitDays, rare.waitDays + 2)
})

test('النطاق: من ٧٥ إلى ١٢٥ من كل مئة، مقرّبًا إلى أقرب عشرة', () => {
  assert.deepEqual(range(75), [60, 90])   // مثال المواصفات: «بين ٦٠ و٩٠ ساعة»
  assert.deepEqual(range(168), [130, 210])
  assert.equal(range(null), null)
  assert.deepEqual(range(6), [5, 8])
  assert.equal(approxDays(17.6), 18)
  assert.equal(approxDays(0.3), 0.5)
})

test('الانتقال بين الأيدي وأبطؤه', () => {
  const task = { stages: [st('a', 'assistant', 'lt1', 'none'), st('b', 'lawyer', 'lt1', 'hours'), st('c', 'dept', 'lt1', 'gtweek'), st('d', 'lawyer', 'lt1', 'none')], decisions: [] }
  const H = handoffs(task)
  assert.equal(H.list.length, 3)
  assert.equal(H.roles, 3)
  assert.equal(H.slowest.toActor, 'dept')
  assert.equal(H.list[1].kind, 'org')
  assert.equal(H.list[0].kind, 'inside')
})

test('القيد يُبقي المرحلة «باقية لاشتراط»، والاعتماد يصير إلكترونيًّا', () => {
  const task = { stages: [st('a', 'lawyer', 'lt1', 'none', { name: 'صياغة المذكرة' }), st('b', 'head', 'lt1', '1to3', { name: 'مراجعتها واعتمادها' }), st('c', 'top', 'lt1', 'none', { name: 'التوقيع', constraints: ['handsig'] })], decisions: [] }
  const tr = transform(task)
  assert.equal(tr.get('a').kind, 'draft')
  assert.equal(tr.get('b').kind, 'approval')
  assert.equal(tr.get('c').kind, 'locked')
})
