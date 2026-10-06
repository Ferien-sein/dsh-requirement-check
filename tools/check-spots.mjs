/**
 * 检查盲点清单与三语文案是否一一对应（留在仓库里，以后加盲点时用它）。
 *
 * 为什么需要：盲点的 id 在 blindspots.js 定义一次，标题/理由/句式在 i18n.js 三语各一份。
 * 两头靠字符串键对应，很容易加了一头忘了另一头 —— 而漏了只会显示成 undefined，
 * 不一定报错。有这条检查就不用靠肉眼对。
 *
 * 用法: node tools/check-spots.mjs
 */
import { BLIND_SPOTS } from '../src/blindspots.js'
import { stringsFor } from '../src/i18n.js'
// ★ LOCALES 在 locale.js 里，不在 i18n.js（i18n.js 导出 STRINGS / fmt / stringsFor）
import { LOCALES } from '../src/locale.js'

const ids = BLIND_SPOTS.map((s) => s.id)
let bad = 0

console.log('SPOTS 数量:', ids.length)
console.log('ids:', ids.join(', '))
console.log()

for (const loc of LOCALES) {
  const S = stringsFor(loc)
  const miss = { titles: [], why: [], fix: [] }
  for (const id of ids) {
    if (!S.spotTitles[id]) miss.titles.push(id)
    if (!S.spotWhy[id]) miss.why.push(id)
    if (!S.spotFix[id]) miss.fix.push(id)
  }
  const tot = miss.titles.length + miss.why.length + miss.fix.length
  if (tot) bad += tot
  console.log(`[${loc}] 缺 ${tot} 条` + (tot ? ' → ' + JSON.stringify(miss) : ' (全有)'))
}

console.log()
const KINDS = ['program', 'plugin', 'script']
for (const loc of LOCALES) {
  const S = stringsFor(loc)
  // 合法键：就是某个 spot id；或者是「id.类型」形式的按类型覆盖
  const extra = Object.keys(S.spotTitles).filter((k) => {
    if (ids.includes(k)) return false
    const dot = k.lastIndexOf('.')
    if (dot > 0) {
      const base = k.slice(0, dot)
      const kind = k.slice(dot + 1)
      if (ids.includes(base) && KINDS.includes(kind)) return false
    }
    return true
  })
  if (extra.length) bad += extra.length
  console.log(`[${loc}] 无法识别的 spotTitles 键:`, extra.length ? extra.join(', ') : '(无)')
}

// 按类型覆盖必须成对：写了 spotTitles['x.kind']，就该有 spotWhy / spotFix 的同名键，
// 否则缺失项的标题按类型换了、理由却没换 —— 看着对、其实半截。
console.log()
for (const loc of LOCALES) {
  const S = stringsFor(loc)
  for (const key of Object.keys(S.spotTitles)) {
    if (!key.includes('.')) continue
    for (const field of ['spotWhy', 'spotFix']) {
      if (!S[field] || !S[field][key]) {
        bad++
        console.log(`★ [${loc}] ${field} 缺按类型覆盖键: ${key}`)
      }
    }
  }
}

// 每个 spot 必须有 severity 和命中规则，否则检查永远不命中
console.log()
for (const s of BLIND_SPOTS) {
  const problems = []
  if (!s.severity) problems.push('缺 severity')
  if (!(s.ch instanceof RegExp)) problems.push('缺 ch 规则')
  if (!(s.en instanceof RegExp)) problems.push('缺 en 规则')
  if (problems.length) {
    bad += problems.length
    console.log(`★ ${s.id}: ${problems.join(', ')}`)
  }
}

console.log()
if (bad) {
  console.log(`★ 发现 ${bad} 个问题`)
  process.exit(1)
}
console.log('✔ 盲点清单与三语文案完全对应')
