// ═══ مزوّدُ التطوير — لا يُستعمل مع عميلٍ حقيقي ═══
// يُرجع ناتجًا ثابتًا مكتوبًا بيدٍ لمثال الحكاية في المواصفات، ليُختبر مسارُ الترتيب والمراجعة
// والشواهد وأسئلة التوضيح كاملًا دون مزوّد. وأيُّ كلامٍ آخر يُرجع ناتجًا فارغًا فتعمل الصفحةُ ببديلها.

const EXAMPLE = {
  task_title: 'دعوى مقامة على الجهة',
  entry_trigger: { text: 'تبليغ عن طريق ناجز', channel: 'gov', evidence: 'يجينا التبليغ عن طريق ناجز' },
  exit_condition: { text: '', evidence: null },
  monthly_frequency: { value: null, evidence: null },
  stages: [
    { id: 's1', name: 'وصول التبليغ وقيده', summary: 'يصل التبليغ عن طريق ناجز، فيسجله المساعد في ملف الإكسل.', conditional: false, condition: null,
      actor: { value: 'assistant', confidence: 'stated', evidence: 'والمساعد يسجله في ملف الإكسل' },
      channels: { value: ['gov', 'sheet'], confidence: 'stated', evidence: 'يجينا التبليغ عن طريق ناجز، والمساعد يسجله في ملف الإكسل' },
      work_time: { value: null, confidence: 'unknown', evidence: null }, wait_time: { value: null, confidence: 'unknown', evidence: null },
      friction: { value: null, reasons: [], confidence: 'unknown', evidence: null }, documents_in: ['تبليغ'], documents_out: [], constraints: [] },
    { id: 's2', name: 'إرساله إلى المحامي', summary: 'يرسله المساعد بالبريد الإلكتروني.', conditional: false, condition: null,
      actor: { value: 'assistant', confidence: 'stated', evidence: 'ويرسله لي بالإيميل' },
      channels: { value: ['email'], confidence: 'stated', evidence: 'ويرسله لي بالإيميل' },
      work_time: { value: 'lt1', confidence: 'inferred', evidence: 'ويرسله لي بالإيميل' }, wait_time: { value: null, confidence: 'unknown', evidence: null },
      friction: { value: null, reasons: [], confidence: 'unknown', evidence: null }, documents_in: [], documents_out: [], constraints: [] },
    { id: 's3', name: 'طلب المستندات من الإدارة المعنية', summary: 'يطلب المحامي المستندات من الإدارة المعنية.', conditional: false, condition: null,
      actor: { value: 'lawyer', confidence: 'stated', evidence: 'أطلب من الإدارة المعنية المستندات' },
      channels: { value: [], confidence: 'unknown', evidence: null },
      work_time: { value: null, confidence: 'unknown', evidence: null }, wait_time: { value: null, confidence: 'unknown', evidence: null },
      friction: { value: null, reasons: [], confidence: 'unknown', evidence: null }, documents_in: [], documents_out: [], constraints: [] },
    { id: 's4', name: 'وصول المستندات', summary: 'تتأخر الإدارة المعنية في الرد.', conditional: false, condition: null,
      actor: { value: 'dept', confidence: 'stated', evidence: 'لأنهم ما يردون' },
      channels: { value: [], confidence: 'unknown', evidence: null },
      work_time: { value: null, confidence: 'unknown', evidence: null }, wait_time: { value: 'gtweek', confidence: 'stated', evidence: 'نتأخر هنا أسبوع أو أكثر' },
      friction: { value: 'often', reasons: ['docs'], confidence: 'stated', evidence: 'وغالبًا نتأخر هنا أسبوع أو أكثر لأنهم ما يردون' }, documents_in: [], documents_out: ['مستندات مؤيدة'], constraints: [] },
    { id: 's5', name: 'دراسة القضية وتحديد من يتولاها', summary: 'يدرس المحامي القضية ويقرر: تُمسك داخليًا أو تُعطى المكتب الخارجي.', conditional: false, condition: null,
      actor: { value: 'lawyer', confidence: 'stated', evidence: 'بعدها أدرس القضية وأقرر' },
      channels: { value: [], confidence: 'unknown', evidence: null },
      work_time: { value: null, confidence: 'unknown', evidence: null }, wait_time: { value: null, confidence: 'unknown', evidence: null },
      friction: { value: null, reasons: [], confidence: 'unknown', evidence: null }, documents_in: ['مستندات مؤيدة'], documents_out: [], constraints: [] },
    { id: 's6', name: 'صياغة المذكرة', summary: 'تُكتب المذكرة داخليًا أو في المكتب الخارجي.', conditional: false, condition: null,
      actor: { value: null, confidence: 'unknown', evidence: null },
      channels: { value: [], confidence: 'unknown', evidence: null },
      work_time: { value: null, confidence: 'unknown', evidence: null }, wait_time: { value: null, confidence: 'unknown', evidence: null },
      friction: { value: null, reasons: [], confidence: 'unknown', evidence: null }, documents_in: [], documents_out: ['مذكرة جوابية'], constraints: [] },
    { id: 's7', name: 'مراجعة المذكرة', summary: 'ترجع المذكرة إلى المحامي فيراجعها.', conditional: false, condition: null,
      actor: { value: 'lawyer', confidence: 'stated', evidence: 'وترجع لي أراجعها' },
      channels: { value: [], confidence: 'unknown', evidence: null },
      work_time: { value: null, confidence: 'unknown', evidence: null }, wait_time: { value: null, confidence: 'unknown', evidence: null },
      friction: { value: 'sometimes', reasons: ['rework'], confidence: 'stated', evidence: 'وأحيانًا ترجع لهم مرتين ثلاث' }, documents_in: ['مذكرة جوابية'], documents_out: [], constraints: [] },
    { id: 's8', name: 'توقيع المدير', summary: 'يوقّع المدير المذكرة، ويأخذ ذلك أيامًا.', conditional: false, condition: null,
      actor: { value: 'head', confidence: 'inferred', evidence: 'بعدين المدير يوقّع' },
      channels: { value: [], confidence: 'unknown', evidence: null },
      work_time: { value: null, confidence: 'unknown', evidence: null }, wait_time: { value: '1to3', confidence: 'stated', evidence: 'وهذا لحاله ياخذ أيام' },
      friction: { value: 'sometimes', reasons: ['approval'], confidence: 'inferred', evidence: 'وهذا لحاله ياخذ أيام' }, documents_in: ['مذكرة جوابية'], documents_out: [], constraints: [] },
  ],
  decisions: [{ after_stage: 's7', question: 'تُعتمد المذكرة، أم ترجع للتعديل؟', yes_to: 's8', no_to: 's6', evidence: 'وأحيانًا ترجع لهم مرتين ثلاث' }],
  clarifications: [
    { question: 'من يصوغ المذكرة غالبًا؟', options: ['المحامي أو المستشار', 'مكتب محاماة خارجي'], target: 's6.actor' },
    { question: 'كم تأخذ صياغة المذكرة من عمل فعلي؟', options: ['نصف يوم', 'يوم كامل', 'أكثر من يوم'], target: 's6.work_time' },
  ],
  redactions: [],
  other_tasks: [],
}

export async function complete({ story }) {
  await new Promise((r) => setTimeout(r, 1200)) // كأنّ نموذجًا يعمل
  if (story.includes('يجينا التبليغ')) return JSON.stringify(EXAMPLE)
  return JSON.stringify({ task_title: '', stages: [] })
}

export async function transcribe() {
  return 'يجينا التبليغ عن طريق ناجز، والمساعد يسجله في ملف الإكسل ويرسله لي بالإيميل.'
}
