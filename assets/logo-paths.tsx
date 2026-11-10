/* ملفٌّ مولَّد — لا يُحرَّر بيد.
 * المولِّد: npm run gen:assets   ·   المصدر: app/src/components/Logo.tsx (sha256:6332ed8dfa2515c8)
 * الشعارُ رسمُ ملف الهوية المعتمد حرفًا — أربعُ طبقاتٍ في فضاءٍ واحد، يكفي تبديلُ صندوقِ
 * العرض لاقتطاع تركيبٍ منها. ويجزم check:site طزاجته (ج٣).
 *
 * **والرسمُ يُكتب مرّةً ويُستدعى**: تُعرَّف الطبقاتُ مرّةً في `LogoDefs` ويشير إليها كلُّ
 * موضعٍ بـ`<use>` — فيبقى رسمُ الملف نفسَه، ويُنقل مرّةً واحدة. */

export const BRAND = 'إذكاء'
export const TAGLINE = 'منصّة إدارة الأقسام القانونيّة'

const D_NAME = 'M18 62 27 75 387 -30 453 -160 443 -173 319 -149C317 -149 315 -148 313 -148C177 -134 103 -198 103 -236C103 -274 193 -295 231 -295C282 -295 328 -257 354 -219L368 -220L372 -230C413 -324 377 -425 279 -425C164 -425 75 -281 75 -175C75 -127 93 -88 128 -58C118 -49 108 -38 98 -27ZM689 0C721 0 738 -17 738 -49V-164C658 -164 629 -172 629 -221V-751H611L522 -626L546 -221C556 -68 598 0 689 0ZM797 -355 788 -298 863 -294C1043 -284 1183 -278 1389 -278H1761C1868 -278 1902 -273 1914 -219L1920 -191C1760 -180 1420 -164 1115 -164H737L690 -148V0H1118C1556 0 1790 -44 1900 -79L1936 -186C1987 -334 1924 -425 1742 -425H1392C1192 -425 1036 -422 838 -441L1223 -591L1287 -767L1274 -779C942 -635 828 -542 797 -355ZM2194 -523H2177L2133 -370C2249 -308 2330 -235 2351 -177C2289 -169 2178 -164 2130 -164C2011 -164 2017 -197 2004 -248H1987C1983 -203 1979 -146 1979 -120C1979 -37 2018 1 2099 1C2153 1 2246 -16 2312 -46L2346 -122C2397 -234 2375 -314 2317 -391L2337 -428ZM2561 -754H2544V-753L2468 -657L2498 16H2516L2562 -142C2572 -176 2577 -210 2577 -245V-522L2608 -561ZM2404 322 2410 331 2596 277 2629 210 2621 201 2580 209C2566 212 2553 213 2542 213C2478 213 2455 178 2458 163C2461 151 2489 139 2512 139C2543 139 2561 159 2575 180L2589 177L2591 173C2614 122 2592 68 2540 68C2493 68 2461 115 2447 147C2427 191 2431 231 2462 259C2457 264 2452 269 2446 275Z'
const D_NAME_GOLD = 'M2296 -697C2297 -698 2297 -711 2296 -712L2209 -799L2121 -711V-698L2209 -610ZM1497 -925.5C1504 -927.5 1509 -929.5 1514 -934.5L1552 -971.5L1549 -975.5L1072 -878.5C1066 -876.5 1059 -873.5 1055 -868.5L1028 -839.5L1031 -834.5Z'
const D_DOTS = 'M3036.4 -424.4C3046.3 -434.3 3062.2 -434.3 3072 -424.4L3248.1 -248.3C3257.9 -238.5 3257.9 -222.6 3248.1 -212.8L3072 -36.6C3062.2 -26.8 3046.3 -26.8 3036.4 -36.6L2860.3 -212.8C2850.5 -222.6 2850.5 -238.5 2860.3 -248.3ZM3499 -424.4C3508.9 -434.3 3524.8 -434.3 3534.6 -424.4L3710.7 -248.3C3720.6 -238.5 3720.6 -222.6 3710.7 -212.8L3534.6 -36.6C3524.8 -26.8 3508.9 -26.8 3499 -36.6L3322.9 -212.8C3313.1 -222.6 3313.1 -238.5 3322.9 -248.3Z'
const D_DIAMOND = 'M3267.7 -717.4C3277.6 -727.3 3293.5 -727.3 3303.3 -717.4L3479.4 -541.3C3489.3 -531.5 3489.3 -515.6 3479.4 -505.7L3303.3 -329.6C3293.5 -319.8 3277.6 -319.8 3267.7 -329.6L3091.6 -505.7C3081.8 -515.6 3081.8 -531.5 3091.6 -541.3Z'

const ID = { name: 'ethka-d-name', nameGold: 'ethka-d-name-gold', dots: 'ethka-d-dots', diamond: 'ethka-d-diamond' }

export const BOX = {"lockup":{"x":18,"y":-976,"w":3701,"h":1307},"emblem":{"x":2852,"y":-725,"w":867,"h":696},"mark":{"x":3084,"y":-725,"w":403,"h":403}} as const
const TAG_MIN_PX = 11
const TAG_RATIO = 0.07

const vb = (b: { x: number; y: number; w: number; h: number }) => b.x + ' ' + b.y + ' ' + b.w + ' ' + b.h

/** تعريفُ الطبقات الأربع — يُصيَّر **مرّةً واحدة** في أعلى الصفحة، ولا يُرسم. */
export function LogoDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <path id={ID.name} d={D_NAME} />
        <path id={ID.nameGold} d={D_NAME_GOLD} />
        <path id={ID.dots} d={D_DOTS} />
        <path id={ID.diamond} d={D_DIAMOND} />
      </defs>
    </svg>
  )
}

/** المعيّن وحده (النقطةُ العليا من الرمز) — توقيعُ العلامة المتكرّر. `s` قُطره بالبكسل. */
export function Mark({ s = 22, c = 'var(--accent)', className = '' }: { s?: number; c?: string; className?: string }) {
  const b = BOX.mark
  return (
    <svg aria-hidden="true" focusable="false" className={className} width={s} height={(s * b.h) / b.w}
      viewBox={vb(b)} style={{ display: 'block', flexShrink: 0 }}>
      <use href={'#' + ID.diamond} fill={c} />
    </svg>
  )
}

/** الرمز — النقاطُ الثلاث. `s` عرضُه بالبكسل. */
export function Emblem({ s = 28, c = 'var(--accent)', ink = 'var(--ink)', className = '' }: { s?: number; c?: string; ink?: string; className?: string }) {
  const b = BOX.emblem
  return (
    <svg aria-hidden="true" focusable="false" className={className} width={s} height={(s * b.h) / b.w}
      viewBox={vb(b)} style={{ display: 'block', flexShrink: 0 }}>
      <use href={'#' + ID.dots} fill={ink} />
      <use href={'#' + ID.diamond} fill={c} />
    </svg>
  )
}

/** الشعار — يُقاس **بالعرض** والارتفاعُ يتبع نسبةَ الملف بلا تشويه، والسطرُ التابع نصٌّ تحته. */
export function Logo({ w = 104, c = 'var(--accent)', nameColor = 'var(--ink)', tagline = true }: {
  w?: number
  c?: string
  nameColor?: string
  tagline?: boolean
}) {
  const b = BOX.lockup
  const lock = (
    <svg role="img" aria-label={BRAND}
      width={w} height={(w * b.h) / b.w} viewBox={vb(b)} style={{ display: 'block', flexShrink: 0 }}>
      <use href={'#' + ID.name} fill={nameColor} />
      <use href={'#' + ID.dots} fill={nameColor} />
      <use href={'#' + ID.nameGold} fill={c} />
      <use href={'#' + ID.diamond} fill={c} />
    </svg>
  )
  if (!tagline) return lock
  const size = Math.max(TAG_MIN_PX, Math.round(w * TAG_RATIO))
  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {lock}
      <span style={{ display: 'block', fontWeight: 700, lineHeight: 1.5, whiteSpace: 'nowrap', fontSize: size + 'px', color: c, marginTop: Math.round(size * 0.55) + 'px' }}>{TAGLINE}</span>
    </span>
  )
}

/** الشعار وتحته سطرُ سياقٍ نصّيّ (الجهة) — يُصفّ على محور الشعار. */
export function LogoBlock({ w = 104, c, nameColor, tagline, sub, align = 'start' }: {
  w?: number
  c?: string
  nameColor?: string
  tagline?: boolean
  sub?: string
  align?: 'start' | 'center'
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'center' ? 'center' : 'flex-start', textAlign: align === 'center' ? 'center' : 'start' }}>
      <Logo w={w} c={c} nameColor={nameColor} tagline={tagline} />
      {sub && <div className="logo-sub">{sub}</div>}
    </div>
  )
}
