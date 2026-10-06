/**
 * 往 src/i18n.js 的三个语言块里补「类型专属盲点」的文案。
 *
 * 为什么用脚本而不是手改：i18n.js 有 390 多行、三个语言块结构相同，
 * 手动在 6 个位置（3 语言 × titles/why/fix）插入容易插错块 ——
 * 这个项目出过「文案插进错误语言块」的事故（繁体插进简中）。
 * 脚本按「语言块 + 字段块」定位，并且在写盘前做结构校验。
 *
 * 幂等：已存在的键会跳过。
 * 用法: node tools/add-kind-spot-strings.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(HERE, '..', 'src', 'i18n.js')

// ── 要补的文案 ────────────────────────────────────────────────────────────
// 键 → { zh-CN: [...], zh-TW: [...], en: [...] }，每条 [字段, 键, 值]
// 字段：t = spotTitles，w = spotWhy，f = spotFix
const NEW = [
  // ---- 插件：挂在哪个软件里 ----
  ['t', 'host-software', {
    'zh-CN': '挂在哪个软件里（宿主是谁）',
    'zh-TW': '掛在哪個軟體裡（宿主是誰）',
    en: 'Which software it plugs into (the host)',
  }],
  ['w', 'host-software', {
    'zh-CN': '插件挂在别人的软件里运行。不说清宿主是谁，写出来根本没处挂 —— 不同软件的插件机制完全不同。',
    'zh-TW': '外掛掛在別人的軟體裡執行。不說清宿主是誰，寫出來根本沒處掛 —— 不同軟體的外掛機制完全不同。',
    en: 'A plugin runs inside someone else\u2019s software. Without naming the host it cannot be attached anywhere \u2014 every host has a completely different plugin mechanism.',
  }],
  ['f', 'host-software', {
    'zh-CN': '句式：做成【DeepSeek Harness / Chrome / VS Code / Excel】的插件；版本是【…】。',
    'zh-TW': '句式：做成【DeepSeek Harness／Chrome／VS Code／Excel】的外掛；版本是【…】。',
    en: 'Pattern: a plugin for [DeepSeek Harness / Chrome / VS Code / Excel], version [...].',
  }],

  // ---- 插件：宿主接口 ----
  ['t', 'host-api', {
    'zh-CN': '要不要跟宿主交换信息（接口）',
    'zh-TW': '要不要跟宿主交換資訊（介面）',
    en: 'Whether it must exchange data with the host (API)',
  }],
  ['w', 'host-api', {
    'zh-CN': '要读宿主的当前内容、或把结果写回去，就必须用宿主提供的接口 —— 这是插件最容易卡住的地方。',
    'zh-TW': '要讀宿主目前的內容、或把結果寫回去，就必須用宿主提供的介面 —— 這是外掛最容易卡住的地方。',
    en: 'Reading the host\u2019s current content or writing results back requires the host API \u2014 this is where plugins get stuck most often.',
  }],
  ['f', 'host-api', {
    'zh-CN': '句式：要能读【我正在编辑的文字】，把结果【插回输入框】；没有现成接口的话，告诉我替代做法。',
    'zh-TW': '句式：要能讀【我正在編輯的文字】，把結果【插回輸入框】；沒有現成介面的話，告訴我替代做法。',
    en: 'Pattern: it must read [the text I am editing] and put the result [back into the input]; if there is no API, tell me an alternative.',
  }],

  // ---- 脚本：怎么运行 ----
  ['t', 'script-run', {
    'zh-CN': '怎么运行它（双击还是命令行）',
    'zh-TW': '怎麼執行它（雙擊還是命令列）',
    en: 'How it is run (double-click or command line)',
  }],
  ['w', 'script-run', {
    'zh-CN': '脚本没有安装包，「怎么跑起来」就是它的使用方式。不说清可能拿到一个不知道怎么用的文件。',
    'zh-TW': '腳本沒有安裝檔，「怎麼跑起來」就是它的使用方式。不說清楚可能拿到一個不知道怎麼用的檔案。',
    en: 'A script has no installer, so "how do I run it" is its entire usage. Without it you may receive a file you do not know how to use.',
  }],
  ['f', 'script-run', {
    'zh-CN': '句式：我【双击一个 .bat 文件】就跑；或者【每天早上自动跑一次】。',
    'zh-TW': '句式：我【雙擊一個 .bat 檔案】就跑；或者【每天早上自動跑一次】。',
    en: 'Pattern: I [double-click a .bat file] and it runs; or it [runs every morning].',
  }],

  // ---- 脚本：运行环境 ----
  ['t', 'script-runtime', {
    'zh-CN': '需要装什么才能跑（运行环境）',
    'zh-TW': '需要裝什麼才能跑（執行環境）',
    en: 'What must be installed to run it (runtime)',
  }],
  ['w', 'script-runtime', {
    'zh-CN': '脚本依赖 Python / Node / 第三方库的版本。不说清会出现「在他电脑上跑不起来」。',
    'zh-TW': '腳本依賴 Python／Node／第三方套件的版本。不說清楚會出現「在他電腦上跑不起來」。',
    en: 'A script depends on specific Python / Node / library versions. Without this, it will not run on someone else\u2019s machine.',
  }],
  ['f', 'script-runtime', {
    'zh-CN': '句式：运行环境用【我这台电脑上已有的 Python 3.12】；不要让我额外装一堆东西。',
    'zh-TW': '句式：執行環境用【我這台電腦上已有的 Python 3.12】；不要讓我額外裝一堆東西。',
    en: 'Pattern: use [the Python 3.12 already on my machine]; do not make me install a pile of extra things.',
  }],

  // ---- delivery 按类型换标题/文案 ----
  ['t', 'delivery.program', {
    'zh-CN': '怎么交付、以后怎么打开（使用方式）',
    'zh-TW': '怎麼交付、以後怎麼開啟（使用方式）',
    en: 'How it is delivered and reopened',
  }],
  ['w', 'delivery.program', {
    'zh-CN': '决定最终给你 exe、文件夹还是网页；不写清可能拿到一堆没法直接用的东西。',
    'zh-TW': '決定最後給你 exe、資料夾還是網頁；不寫清楚可能拿到一堆沒辦法直接用的東西。',
    en: 'This decides whether you get an exe, a folder, or a web page; without it you may receive something you cannot use directly.',
  }],
  ['f', 'delivery.program', {
    'zh-CN': '句式：给我【一个 exe / 一个文件夹，双击里面某个文件】；要放桌面。',
    'zh-TW': '句式：給我【一個 exe／一個資料夾，雙擊裡面某個檔案】；要放桌面。',
    en: 'Pattern: Give me [an exe / a folder with a file to double-click]; put it on the desktop.',
  }],

  ['t', 'delivery.plugin', {
    'zh-CN': '怎么装上、在哪儿用（插件交付方式）',
    'zh-TW': '怎麼裝上、在哪裡用（外掛交付方式）',
    en: 'How it is installed and where you use it',
  }],
  ['w', 'delivery.plugin', {
    'zh-CN': '插件不是双击就能用的程序：要么本地装进宿主、要么发同事装、要么上架插件市场 —— 三件事的做法差很远。',
    'zh-TW': '外掛不是雙擊就能用的程式：要嘛本機裝進宿主、要嘛發同事裝、要嘛上架外掛市場 —— 三件事的做法差很遠。',
    en: 'A plugin is not a double-clickable program: install locally into the host, hand it to colleagues, or publish to a marketplace \u2014 these are very different jobs.',
  }],
  ['f', 'delivery.plugin', {
    'zh-CN': '句式：先在我自己机器上装好能用；之后可能【打包发给同事 / 上架插件市场】。',
    'zh-TW': '句式：先在我自己機器上裝好能用；之後可能【打包發給同事／上架外掛市場】。',
    en: 'Pattern: working on my own machine first; later maybe [packaged for colleagues / published to a marketplace].',
  }],

  ['t', 'delivery.script', {
    'zh-CN': '怎么拿到、放在哪（脚本交付方式）',
    'zh-TW': '怎麼拿到、放在哪（腳本交付方式）',
    en: 'How you receive it and where it lives',
  }],
  ['w', 'delivery.script', {
    'zh-CN': '脚本一般就是一个文件：给你放哪个目录、以后从哪儿跑起来，说清才省事。',
    'zh-TW': '腳本一般就是一個檔案：給你放哪個目錄、以後從哪兒跑起來，說清才省事。',
    en: 'A script is usually just one file: saying which folder it goes in and where you run it from saves a lot of trouble.',
  }],
  ['f', 'delivery.script', {
    'zh-CN': '句式：把脚本放在【桌面/某个文件夹】，我【双击那个 .bat】就用。',
    'zh-TW': '句式：把腳本放在【桌面／某個資料夾】，我【雙擊那個 .bat】就用。',
    en: 'Pattern: put the script in [the desktop / a folder], and I [double-click the .bat] to use it.',
  }],
]

// ── 注入 ──────────────────────────────────────────────────────────────────
const blocks = { 'zh-CN': "'zh-CN': {", 'zh-TW': "'zh-TW': {", en: 'en: {' }
const fields = { t: 'spotTitles', w: 'spotWhy', f: 'spotFix' }

let src = fs.readFileSync(FILE, 'utf8')
let added = 0
const skipped = []

// 逐条插入：定位「语言块 → 字段块」，插在该字段块的最后一条之后
for (const [fkey, spotKey, values] of NEW) {
  const fieldName = fields[fkey]
  for (const loc of ['zh-CN', 'zh-TW', 'en']) {
    const value = values[loc]
    if (!value) continue
    // 已存在就跳过（幂等）
    const probe = new RegExp(
      `${JSON.stringify(spotKey).replace(/"/g, "['\"]")}\\s*:`, 'm')
    const blockStart = src.indexOf(blocks[loc])
    if (blockStart < 0) throw new Error('找不到语言块: ' + loc)
    const fieldStart = src.indexOf(fieldName + ': {', blockStart)
    if (fieldStart < 0) throw new Error('在 ' + loc + ' 里找不到 ' + fieldName)
    const fieldEnd = src.indexOf('\n    },', fieldStart)
    if (fieldEnd < 0) throw new Error('找不到 ' + loc + '/' + fieldName + ' 的结束位置')
    const fieldBody = src.slice(fieldStart, fieldEnd)
    const keyRe = new RegExp(`(^|\\n)\\s*['"]?${spotKey.replace(/\./g, '\\.')}['"]?\\s*:`)
    if (keyRe.test(fieldBody)) { skipped.push(`${loc}/${fieldName}/${spotKey}`); continue }

    // 用 JSON.stringify 产出，转义交给它（手写引号出过错）
    const line = `\n      ${JSON.stringify(spotKey)}: ${JSON.stringify(value)},`
    src = src.slice(0, fieldEnd) + line + src.slice(fieldEnd)
    added++
  }
}

fs.writeFileSync(FILE, src, 'utf8')
console.log(`  新增 ${added} 条`)
if (skipped.length) console.log(`  已存在跳过 ${skipped.length} 条: ${skipped.slice(0, 6).join(', ')}${skipped.length > 6 ? ' …' : ''}`)
