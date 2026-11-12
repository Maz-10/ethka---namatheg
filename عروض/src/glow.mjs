// ═══ التوهّج الذهبيّ — صورةٌ شفّافة تُولَّد عند البناء (لا ملفَّ ثنائيًّا في المستودع) ═══
// «خلفيةٌ بتوهّجٍ ذهبيٍّ خفيف» من المنصّة (`#app-glow` في `app/src/index.css`). كان تدرّجًا شعاعيًّا
// متجهيًّا، لكن بعضَ المحرّكات (LibreOffice ومصدِّرات PDF) ترسمه حلقاتٍ متدرّجة ظاهرة؛ والصورةُ
// تُرسم في كل محرّكٍ كما هي. سقوطٌ غاوسيّ ناعم، وأقصى شفافيّته `alpha` من مئة.

import { deflateSync, crc32 } from 'node:zlib'

const cache = new Map()

function png(w, h, rgba) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0)
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0 // ٨ بتّات · RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

/** صورةُ توهّجٍ مربّعة (base64 بصيغة pptxgenjs) بلونٍ ست عشريّ وأقصى شفافيّة ٠–١٠٠. */
export function glowData(hex, alpha) {
  const key = hex + alpha
  if (cache.has(key)) return cache.get(key)
  const N = 512
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const buf = Buffer.alloc(N * N * 4)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - N / 2 + 0.5, y - N / 2 + 0.5) / (N / 2) // ٠ في المركز · ١ على الحافّة
      const a = d >= 1 ? 0 : Math.exp(-(d * d) / 0.18) * (1 - d * d) // غاوسيّ يُطوى إلى الصفر عند الحافّة
      const i = (y * N + x) * 4
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b
      buf[i + 3] = Math.round(a * alpha * 2.55)
    }
  }
  const data = 'image/png;base64,' + png(N, N, buf).toString('base64')
  cache.set(key, data)
  return data
}
