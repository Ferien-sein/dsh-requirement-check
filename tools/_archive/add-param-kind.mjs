/**
 * 给三个语言块各补一条 paramKind（作为可选的 type 参数说明）。
 * 幂等：已存在就跳过。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(HERE, '..', 'src', 'i18n.js')

const ADD = {
  'zh-CN': '可选的「做什么类型」：program（电脑程序）/ plugin（某个软件的插件）/ script（自动化脚本）。'
    + '不传就按通用要点检查；传了会额外要求该类型最关键的那几点 —— '
    + '插件要问「挂在哪个软件里、要不要跟宿主交换信息」，脚本要问「怎么运行、需要什么环境」。',
  'zh-TW': '可選的「做什麼類型」：program（電腦程式）／ plugin（某個軟體的外掛）／ script（自動化腳本）。'
    + '不傳就按通用要點檢查；傳了會額外要求該類型最關鍵的那幾點 —— '
    + '外掛要問「掛在哪個軟體裡、要不要跟宿主交換資訊」，腳本要問「怎麼執行、需要什麼環境」。',
  en: 'Optional "what kind of thing": program / plugin (for some host software) / script. '
    + 'When omitted, only the generic checklist is applied. When given, it additionally requires '
    + 'the points that matter most for that kind \u2014 for a plugin: which software it plugs into and '
    + 'whether it must talk to the host; for a script: how it is run and what runtime it needs.',
}

let src = fs.readFileSync(FILE, 'utf8')
let n = 0
for (const [loc, text] of Object.entries(ADD)) {
  const anchor = src.indexOf(`paramMaxItems:`, loc === 'en' ? src.indexOf('en: {') : src.indexOf(`'${loc}': {`))
  if (anchor < 0) throw new Error('找不到 ' + loc + ' 的 paramMaxItems')
  // 该行的结束位置
  const lineEnd = src.indexOf('\n', anchor)
  const line = src.slice(anchor, lineEnd)
  if (line.includes('paramKind:')) { continue }
  const insert = `\n    paramKind: ${JSON.stringify(text)},`
  src = src.slice(0, lineEnd) + insert + src.slice(lineEnd)
  n++
}
fs.writeFileSync(FILE, src, 'utf8')
console.log(`  新增 ${n} 条 paramKind`)
