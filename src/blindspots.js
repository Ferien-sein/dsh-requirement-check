/**
 * 需求体检：14 项盲区清单 + 打分 + 报告生成
 *
 * 本模块不含任何 DSH API，可以在普通 Node 里直接 import 使用。
 *
 * 判定方式：正则关键词匹配（不是语义理解）。取向是**宁可误报也不漏报** ——
 * 多问一句的成本远低于返工。
 *
 * 多语言：
 *   - 命中规则分 ch（中文，简繁通用）与 en（英文）两套。英文的表达方式与中文
 *     差异太大，无法共用一套正则，所以按语言选择；遇到中英混写的描述，
 *     把两套并起来用更宽松。
 *   - 正文文案（标题/理由/句式）在 i18n.js 里，按 locale 取。
 *
 * ⚠️ 地名用词：繁体部分按台湾习惯（資料／範例／篩選），不是简繁转码。
 */
import { stringsFor, fmt } from './i18n.js'
import { resolveLocale, detectLocale, LOCALES, LOCALE_NAMES } from './locale.js'
import { detectPlatform, defaultTargetSentence, compatNote, platformToTarget, describeTarget } from './platform.js'

export const SEVERITY_ORDER = { high: 0, mid: 1, low: 2 }

/**
 * 单一事实来源：每项盲区只在这里定义一次，含 id / 严重度 / 两套命中规则。
 * 标题、理由、句式、量词从句的文案在 i18n.js。
 */
const SPOTS = [
  { id: 'goal', severity: 'high', ch: /想(要)?做|帮我(做|写|弄|把|整理|汇总|生成|算|处理)|需要一个|开发一个|做一个|做个|目的是|用来|我要(做|写|个)/, en: /\b(i want to (build|make|create)|i need (a|an|to)|help me (build|make|write|create)|build (a|an|me)|make (a|an|me)|create (a|an)|develop (a|an)|i'?d like (a|an|to))\b/i },
  { id: 'scope-out', severity: 'high', ch: /不做|不(要|用|需)(支持|考虑|要)|暂不|本期不|先不|不接受|禁止|不能|不用管|不涉及|范围外|只(需要|要)(做)?/, en: /\b(out of scope|not in scope|do(es)? ?n[o']t need|no need (for|to)|should not|must not|without (support|multi|any)|only (need|want)|just (one|a single)|no (charts?|network|multi|login|accounts?|sync))\b/i },
  { id: 'done', severity: 'high', ch: /验收|完成标准|成功标准|算(做)?好|怎么判断|达标|一致|一模一样|对齐|核对无误|正确(率)?|必须(完全)?(对|一致)|通过测试/, en: /\b(acceptance|definition of done|success criteria|counts? as (done|success)|how (do|would) i (know|tell)|must match|verif(y|ied)|same as|consistent with|reconcil\w*)\b/i },
  { id: 'input', severity: 'high', ch: /输入|数据源?|读取|导入|来自|\.xlsx|\.csv|\.docx?|\.pdf|\.txt|表格|文件名|文件夹|工作(簿|表)|列(有|是)|字段|第一行|标题行|手动(填|输)/i, en: /\b(input|data ?source|im ?port|read from|comes? from|\.(xlsx?|csv|docx?|pdf|txt|json)\b|spreadsheet|folder|directory|workbook|worksheet|columns?|fields?|header row|(typed|entered) (in|by) hand|manual(ly)? (enter|input|type))\b/i },
  { id: 'output', severity: 'high', ch: /输出|导出|另存|保存到|打印|生成(一个|一份|一张)?(文件|表|图|报告|文档|清单)|结果(表|文件|存|放)|发给|发到|显示(总|出)|摘要|截图/, en: /\b(output|ex ?port|save (to|as)|write (to|out)|print|generat(e|es|ing) (a|an|the)? ?(file|report|doc|list|chart)|result (file|table)|send (to|it)|show (me|the|a)|screen|dashboard|summary)\b/i },
  { id: 'error-case', severity: 'mid', ch: /如果(出错|失败|异常|缺少|没有|重复|对不上)|异常|出错|失败(时|怎么办)|容错|边界|缺失|对不上|不匹配|重复(时|的)|异常(行|数据)/, en: /\b(if .{0,20}(fail|error|missing|duplicat|mismatch)|on (error|failure)|edge cases?|error handling|falls? back|tolerat|invalid|corrupt|blank (value|cell)|missing (column|row|file))\b/i },
  { id: 'operator', severity: 'mid', ch: /我自己|只有我|一个人用|同事|几个人|团队|部门|客户|多人|账号|登录|账号|用户|给谁|使用者/, en: /\b(only me|just me|myself|my ?self|colleagues?|co-?workers?|team|department|multiple (people|users)|users?|accounts?|log ?in|sign ?in|clients?|customers?|who uses|for (me|us))\b/i },
  { id: 'environment', severity: 'mid', ch: /Windows|Mac|macOS|苹果系统|Linux|乌班图|Ubuntu|安卓|iOS|鸿蒙|电脑|手机|平板|浏览器|网页|桌面|离线|联网|内网|本地|上传|云端|服务器|系统|安装|双击|exe|\.app|AppImage|deb|dmg/, en: /\b(windows|mac ?os|macbook|imac|linux|ubuntu|debian|centos|android|ios|ipad|desktop|mobile|phone|tablet|browser|web ?(page|app|site)|offline|online|network|intranet|local(ly)?|upload|cloud|server|install|double-?click|\.exe|\.app|appimage|\.deb|\.dmg)\b/i },
  // 32/64 位单独成项：它决定程序能不能在对方电脑上跑起来，
  // 而且是最容易被忽略、又最容易导致「做好了别人打不开」的一项。
  { id: 'arch', severity: 'mid', ch: /32\s*位|64\s*位|32\s*-?\s*bit|64\s*-?\s*bit|x86|x64|amd64|arm64|aarch64|架构|位数|处理器|芯片/, en: /\b(32[ -]?bit|64[ -]?bit|x86(_64)?|x64|amd64|arm64|aarch64|architecture|\barch\b|processor|chip|apple silicon|intel mac)\b/i },
  { id: 'privacy', severity: 'high', ch: /隐私|敏感|机密|保密|客户(资料|信息|姓名|数据|名单)|身份证|手机号|金额|不上传|不能上传|脱敏|权限|合规|安全|只准|审计/, en: /\b(privac|sensitive|confidential|classif|pii|customer (data|name|info)|id (number|card)|phone number|amounts?|do ?n[o']t upload|no upload|redact|anonymi[sz]e|permission|complian|audit|gdpr|never leave)\b/i },
  { id: 'volume', severity: 'low', ch: /\d+\s*(行|条|万|千|个文件|张|兆|mb|gb|kb|列|人|次)|数据量|量级|批量|几百|几千|几十万|每天(约|大概)?\d/, en: /\b(\d[\d,\.]*\s*(rows?|records?|lines?|files?|items?|entries|mb|gb|kb|thousand|k\b|million)|data (volume|size)|how many (rows|files|records)|a few hundred|thousands|tens of thousands)\b/i },
  { id: 'frequency', severity: 'low', ch: /每天|每周|每月|经常|偶尔|一次|频率|多久用|用时|几分钟|小时|每天下午|早上|日(报|结)|月度|季度/, en: /\b(every ?day|daily|weekly|monthly|quarterly|once a (day|week|month)|often|occasionally|how often|takes? .{0,15}(minutes?|hours?)|a few minutes)\b/i },
  { id: 'pain', severity: 'mid', ch: /现在|目前|以前|手动|人工|本来|原先|复制粘贴|一个个|花(了)?\s*\d+\s*(分钟|小时)|一直是|过去|原来是/, en: /\b(currently|right now|at the moment|today i|used to|previously|manually|by hand|copy(-| )?past|one by one|takes? (me )?(about )?\d+ ?(min|minute|hour)|it used to)\b/i },
  { id: 'reference', severity: 'low', ch: /样例|示例文件|参照|参考|像(微信|excel|某)|模仿|截图|样本|模板.{0,6}提供|我给你(一份|个)|照着/, en: /\b(sample (file|data)|example (file|data)|reference|similar to|like (excel|notion|trello|wechat)|resembl|mimic|screenshot|i ?'?ll (give|send) you (a|an|the) (sample|file|example))\b/i },
  { id: 'delivery', severity: 'mid', ch: /exe|快捷方式|桌面|双击|怎么(打开|运行|启动|用)|安装包|交付|打包|绿色版|给我(一个|个)/, en: /\b(exe|shortcut|desktop|double-?click|how (do i|to) (open|run|start|launch)|installer|deliver|package|portable|standalone|give me (a|an))\b/i },
]

const SPOT_IDS = SPOTS.map((s) => s.id)

/** 有这些特征说明写得比较详细，给一点宽容分（避免「写得多反而分低」） */
const RICH_MARKERS = [
  /因为|所以|并且|然后|第一步|1[.、)]|一、|需求|功能|流程/,
  /\b(because|so that|first(ly)?|second(ly)?|step \d|requirement|feature|workflow)\b/i,
]

function pickRules(spot, locale) {
  if (locale === 'en') return [spot.ch, spot.en]
  // 简繁共用的中文规则；再并上英文规则，兼容中英混写
  return [spot.ch, spot.en]
}

/**
 * 体检一段需求描述。
 *
 * @param {string} text
 * @param {{maxItems?: number, locale?: string}} [options]
 *   locale 可为 'zh-CN' | 'zh-TW' | 'en'；不传则按环境探测。
 */
export function checkRequirement(text, options = {}) {
  const locale = resolveLocale(options.locale)
  const L = stringsFor(locale)
  const maxItems = options.maxItems ?? 8
  const raw = typeof text === 'string' ? text : ''
  const src = raw.trim()

  const toPublic = (spot) => ({
    id: spot.id,
    severity: spot.severity,
    title: L.spotTitles[spot.id],
    why: L.spotWhy[spot.id],
    fix: L.spotFix[spot.id],
  })

  if (!src) {
    return {
      locale,
      ok: false,
      score: 0,
      level: 'empty',
      total: SPOTS.length,
      covered: 0,
      missing: SPOTS.map(toPublic),
      summary: L.emptyReport,
      report: fmt(L.headerFmt, { score: 0, level: L.level.empty, covered: 0, total: SPOTS.length }) +
        '\n\n' + L.emptyReport,
    }
  }

  const covered = []
  const missing = []
  for (const spot of SPOTS) {
    const rules = pickRules(spot, locale)
    ;(rules.some((re) => re.test(src)) ? covered : missing).push(spot)
  }

  const weight = { high: 3, mid: 2, low: 1 }
  const maxScore = SPOTS.reduce((s, x) => s + weight[x.severity], 0)
  const gotScore = covered.reduce((s, x) => s + weight[x.severity], 0)
  let score = Math.round((gotScore / maxScore) * 100)
  const rich = RICH_MARKERS.filter((re) => re.test(src)).length
  const lengthBonus = src.length >= 400 ? 4 : src.length >= 200 ? 2 : 0
  score = Math.min(100, score + lengthBonus + Math.min(rich, 3))

  const level =
    score >= 85 ? 'excellent'
    : score >= 65 ? 'good'
    : score >= 40 ? 'thin'
    : 'vague'

  const missingSorted = missing
    .slice()
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  const shown = missingSorted.slice(0, maxItems).map(toPublic)
  const highMissing = missingSorted.filter((s) => s.severity === 'high')
  const missingIds = missing.map((s) => s.id)

  const summary = buildSummary(L, {
    highMissing: highMissing.map(toPublic),
    missingCount: missing.length,
    shownCount: shown.length,
    shown,
    src,
  })

  // ---- 平台 / 位数：给出「跟随使用者电脑」的具体默认值 ----
  // 需求里往往没写要跑在什么系统、多少位，而这一项最容易导致
  // 「做好了别人打不开」。所以没写时不只提示缺失，直接把本机的情况
  // 算出来当默认值，让用户确认或改掉即可。
  const det = detectPlatform()
  const platformInfo = {
    os: det.os,
    osLabel: det.osLabel,
    arch: det.arch,
    bits: det.bits,
    certain: det.certain,
    target: platformToTarget(det),
    targetLabel: describeTarget(platformToTarget(det), locale),
    defaultSentence: defaultTargetSentence(locale, det),
    compatNote: compatNote(locale, det),
  }
  const platformBlock = buildPlatformBlock(L, {
    envMissing: missingIds.includes('environment'),
    archMissing: missingIds.includes('arch'),
    info: platformInfo,
  })

  const report =
    fmt(L.headerFmt, {
      score,
      level: L.level[level],
      covered: covered.length,
      total: SPOTS.length,
    }) +
    '\n\n' +
    summary +
    platformBlock +
    (highMissing.length === 0 ? '\n' + L.tailOk : '\n' + L.tailNeedMore)

  return {
    locale,
    ok: highMissing.length === 0,
    score,
    level,
    total: SPOTS.length,
    covered: covered.length,
    missing: shown,
    summary,
    platform: platformInfo,
    report,
  }
}

/** 报告里的「目标系统」段：只有相关盲区缺失时才出现 */
function buildPlatformBlock(L, { envMissing, archMissing, info }) {
  if (!envMissing && !archMissing) return ''
  const lines = []
  lines.push('')
  // 括号样式随语言变（中文用【】，英文用冒号）—— 硬写死会让英文报告
  // 出现中文书名号，文案对但符号不对，只有看输出才能发现。
  lines.push(L.platformHeadingPrefix + L.platformHeading + L.platformHeadingSuffix)
  lines.push('  ' + info.defaultSentence)
  if (archMissing) lines.push('  ' + info.compatNote)
  lines.push('  ' + L.platformHowTo)
  return '\n' + lines.join('\n')
}

function buildSummary(L, { highMissing, missingCount, shownCount, shown, src }) {
  const lines = []

  if (highMissing.length === 0) {
    lines.push(L.allGood)
  } else {
    lines.push(fmt(L.mustFixFmt, { n: highMissing.length }))
    for (const s of highMissing) {
      lines.push(`  · ${s.title} —— ${s.why}`)
      lines.push(`    ${L.howToFix}${s.fix}`)
    }
  }

  const other = shown.filter((s) => s.severity !== 'high')
  if (other.length) {
    lines.push('')
    lines.push(L.suggestMore)
    for (const s of other) {
      lines.push(`  · ${s.title} —— ${s.fix}`)
    }
  }

  const notShown = missingCount - shownCount
  if (notShown > 0) {
    lines.push('')
    lines.push(fmt(L.notShownFmt, { n: notShown }))
  }

  if (src.length < 60) {
    lines.push('')
    lines.push(L.tooShort)
  }

  return lines.join('\n')
}

/** 兼容旧接口：只要报告文本 */
export function renderReport(result) {
  if (result && typeof result.report === 'string') {
    const note = result.locale
      ? '\n' + fmt(stringsFor(result.locale).localeNoteFmt, {
          name: LOCALE_NAMES[result.locale] || result.locale,
          all: LOCALES.join(' / '),
        })
      : ''
    return result.report + note
  }
  return ''
}

/** 供测试与外部使用 */
export const BLIND_SPOTS = SPOTS.map((s) => ({
  id: s.id,
  severity: s.severity,
  ch: s.ch,
  en: s.en,
}))

export { SPOT_IDS, detectLocale }
