// ═══ حذفُ الحساس قبل التخزين الدائم ═══
// أسماءُ الأشخاص وأرقامُ القضايا وأسماءُ الخصوم ووسائلُ التواصل تُستبدل بها علامةٌ تدل على نوعها،
// ويُسجَّل نوعُ المحذوف لا نصُّه. والعميلُ مُنبَّهٌ ألا يكتبها أصلًا؛ وهذا حارسٌ ثانٍ لا الأول.

const DIG = '[0-9٠-٩]'
const RULES = [
  { type: 'email', re: /[^\s@]+@[^\s@]+\.[^\s@]+/g, to: '[بريد]' },
  { type: 'phone', re: new RegExp(`(?:\\+?(?:966|٩٦٦)|0|٠)?${DIG}{9,}`, 'g'), to: '[رقم]' },
  { type: 'case_number', re: new RegExp(`((?:رقم\\s+)?(?:القضية|قضية|الدعوى|دعوى|الصك|صك|المعاملة|معاملة)\\s*(?:رقم)?\\s*[:：-]?\\s*)${DIG}[${'0-9٠-٩'}/\\\\-]{2,}`, 'g'), to: '$1[رقم]' },
  { type: 'case_number', re: new RegExp(`${DIG}{5,}`, 'g'), to: '[رقم]' },
  { type: 'person_name', re: /((?:^|[\s(«"])(?:الأستاذة?|الشيخ|السيدة?|المهندسة?|الدكتورة?|د\.|أ\.|م\.)\s+)(?!\[|ال)([ء-ي]+(?:\s+(?:بن|بنت|ابن|آل|أبو|عبد)\s*[ء-ي]+)?)/g, to: '$1[اسم]' },
  { type: 'party_name', re: /((?:^|\s)(?:ضد|خصمنا|المدعي|المدعى عليه|المدعية|شركة|مؤسسة)\s+)(?!\[|في\b|من\b|على\b|عن\b|إلى\b|و\b)([ء-ي]{3,}(?:\s+[ء-ي]{3,})?)/g, to: '$1[طرف]', only: /ضد|خصم|المدع|شركة|مؤسسة/ },
]

// «المحامي» و«المستشار» أدوارٌ في كلام العميل لا ألقاب، فلا يُحذف ما بعدها.
// ألفاظٌ تأتي بعد «شركة/ضد» وليست أسماء: لا تُحذف
const COMMON = /^(?:الطرف|طرف|الآخر|الجهة|جهة|الإدارة|إدارة|المحاماة|محاماة|المكتب|مكتب|خارجية|خاصة|حكومية|كبيرة|صغيرة|التأمين|الاتصالات)/

export function redact(text) {
  if (typeof text !== 'string' || !text) return { text, types: [] }
  const types = new Set()
  let out = text
  for (const r of RULES) {
    out = out.replace(r.re, (...m) => {
      const whole = m[0]
      if (r.type === 'party_name' && COMMON.test(m[2])) return whole
      types.add(r.type)
      return r.to.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? '')
    })
  }
  return { text: out, types: [...types] }
}

/** يمرّ على حقول النص الحرّ في المهمة، ويُرجع أنواعَ ما حُذف. */
export function redactTask(task) {
  const types = new Set(task.redactions || [])
  const fix = (obj, key) => {
    if (obj && typeof obj[key] === 'string') { const r = redact(obj[key]); obj[key] = r.text; r.types.forEach((x) => types.add(x)) }
  }
  for (const k of ['story', 'lastQ', 'systems', 'title']) fix(task, k)
  for (const s of task.stages || []) {
    for (const k of ['name', 'note', 'condition', 'summary']) fix(s, k)
    for (const p of ['actor', 'channels', 'work', 'wait', 'friction']) fix(s[p], 'ev')
  }
  for (const d of task.decisions || []) { fix(d, 'q'); fix(d, 'out'); fix(d, 'ev') }
  if (task.global) { fix(task.global, 'exitOther'); fix(task.global, 'seasonWhen') }
  task.redactions = [...types]
  return task
}
