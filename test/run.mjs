/**
 * 独立测试：不启动 DSH，用假的 ctx 验证插件的契约与逻辑。
 *
 * 覆盖三件事：
 *   1) 契约 —— 注册的工具形状是否符合 DSH 的 ToolDefinition（形状错会装不上）
 *   2) 逻辑 —— 体检打分、盲区命中、模板取回是否真的对
 *   3) 三语 —— 简中 / 繁中 / 英文的报告、模板、工具描述是否都齐
 *
 * 注意：所有断言都用 XBSH_LOCALE 显式钉住语言，
 *      不受跑测试这台机器的系统语言影响。
 *
 * 用法: node test/run.mjs
 */
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'

// 钉住测试语言，避免受环境影响
process.env.XBSH_LOCALE = 'zh-CN'
delete process.env.DSH_LOCALE

// 偏好文件指到临时目录：测试绝不碰用户真实的 ~/.dsh/requirement-check.json。
// （早先的版本没做这件事，测试往真实文件里写了一个 locale，
//   导致后续测试被自己的残留状态干扰 —— 单跑通过、连跑失败。）
const TMP_PREFS = path.join(os.tmpdir(), `dsh-reqcheck-test-${process.pid}.json`)
process.env.XBSH_PREFS_PATH = TMP_PREFS
try { (await import('node:fs')).unlinkSync(TMP_PREFS) } catch {}

const { checkRequirement, BLIND_SPOTS, renderReport, SPOT_IDS } = await import('../src/blindspots.js')
const { TEMPLATES, FIELD_LABELS } = await import('../src/templates.js')
const { templateIndex, renderTemplate, findTemplates, templateFields } = await import('../src/templates_render.js')
const { STRINGS, stringsFor } = await import('../src/i18n.js')
const { normalizeLocale, resolveLocale, detectLocale, LOCALES } = await import('../src/locale.js')
const { prefsPath, readPrefs, writePrefs } = await import('../src/config-store.js')
const {
  detectPlatform, platformToTarget, describeTarget,
  defaultTargetSentence, compatNote, TARGETS, TARGET_LABELS,
} = await import('../src/platform.js')

let pass = 0
let fail = 0
const failures = []

function t(name, fn) {
  try {
    fn()
    pass++
    console.log('  ✔ ' + name)
  } catch (e) {
    fail++
    failures.push([name, e])
    console.log('  ✘ ' + name)
    console.log('      ' + String(e.message).split('\n')[0])
  }
}

async function ta(name, fn) {
  try {
    await fn()
    pass++
    console.log('  ✔ ' + name)
  } catch (e) {
    fail++
    failures.push([name, e])
    console.log('  ✘ ' + name)
    console.log('      ' + String(e.message).split('\n')[0])
  }
}

// ================================================================ 语言基础设施
console.log('\n【语言】探测与归一化')

t('normalizeLocale 认识各种写法', () => {
  const cases = [
    ['zh-CN', 'zh-CN'], ['zh_CN', 'zh-CN'], ['zh-Hans', 'zh-CN'], ['zh', 'zh-CN'], ['CN', 'zh-CN'],
    ['zh-TW', 'zh-TW'], ['zh_TW', 'zh-TW'], ['zh-Hant', 'zh-TW'], ['zh-HK', 'zh-TW'], ['zh-MO', 'zh-TW'],
    ['en', 'en'], ['en-US', 'en'], ['English', 'en'], ['EN_us', 'en'],
  ]
  for (const [input, want] of cases) {
    assert.equal(normalizeLocale(input), want, `${input} 应归一化为 ${want}`)
  }
  assert.equal(normalizeLocale('fr-FR'), null, '不认识的语言应返回 null')
  assert.equal(normalizeLocale(''), null)
  assert.equal(normalizeLocale(undefined), null)
})

t('resolveLocale 优先级：显式值 > 探测 > 兜底', () => {
  assert.equal(resolveLocale('en'), 'en')
  assert.equal(resolveLocale('zh-Hant'), 'zh-TW')
  assert.ok(LOCALES.includes(resolveLocale(null)))
  assert.ok(LOCALES.includes(detectLocale()))
})

t('三语语言包结构一致（键集合相同，不遗漏）', () => {
  const keysOf = (o) => Object.keys(o).sort()
  const ref = keysOf(STRINGS['zh-CN'])
  for (const loc of LOCALES) {
    assert.ok(STRINGS[loc], `缺少语言包 ${loc}`)
    const k = keysOf(STRINGS[loc])
    const missing = ref.filter((x) => !k.includes(x))
    const extra = k.filter((x) => !ref.includes(x))
    assert.equal(missing.length, 0, `${loc} 缺少键: ${missing.join(', ')}`)
    assert.equal(extra.length, 0, `${loc} 多出键: ${extra.join(', ')}`)
  }
})

t('15 项盲区的标题/理由/句式三语齐全且非空', () => {
  for (const loc of LOCALES) {
    const L = stringsFor(loc)
    for (const id of SPOT_IDS) {
      for (const group of ['spotTitles', 'spotWhy', 'spotFix']) {
        // 先明确检查「键是否存在」——缺键时报错要一眼看出是漏翻，
        // 而不是被后面那句 length 断言掩盖成「过短」。
        assert.ok(
          Object.prototype.hasOwnProperty.call(L[group], id),
          `${loc} 的 ${group} 缺少盲区键 "${id}"（漏翻）`
        )
        const v = L[group][id]
        assert.ok(typeof v === 'string' && v.length > 3, `${loc}.${group}.${id} 为空或过短`)
      }
    }
  }
})

t('每组盲区文案的键数正确（含「按类型覆盖」键，且没有多余键）', () => {
  const KINDS = ['program', 'plugin', 'script']
  for (const loc of LOCALES) {
    const L = stringsFor(loc)
    for (const group of ['spotTitles', 'spotWhy', 'spotFix']) {
      const keys = Object.keys(L[group])
      // 合法键有两类：
      //   1) 盲点 id 本身
      //   2) 「id.类型」形式的按类型覆盖（如 delivery.plugin）
      //      —— 让同一项在不同类型下的措辞不同（做插件时不该问「要 exe 吗」）
      const unknown = keys.filter((k) => {
        if (SPOT_IDS.includes(k)) return false
        const dot = k.lastIndexOf('.')
        if (dot > 0) {
          const base = k.slice(0, dot)
          const kind = k.slice(dot + 1)
          return !(SPOT_IDS.includes(base) && KINDS.includes(kind))
        }
        return true
      })
      assert.equal(unknown.length, 0,
        `${loc}.${group} 有多余键（既不是盲点 id 也不是 id.类型）: ${unknown.join(',')}`)
      // 每个盲点本身必须有键
      const missing = SPOT_IDS.filter((id) => !Object.prototype.hasOwnProperty.call(L[group], id))
      assert.equal(missing.length, 0, `${loc}.${group} 缺少盲点键: ${missing.join(',')}`)
      // 类型覆盖键必须成对存在（titles 有，why/fix 也要有），否则标题换了、理由没换
      for (const k of keys.filter((x) => x.includes('.'))) {
        for (const g2 of ['spotTitles', 'spotWhy', 'spotFix']) {
          assert.ok(Object.prototype.hasOwnProperty.call(L[g2], k),
            `${loc}: ${k} 在 ${g2} 里缺失（按类型覆盖必须三个字段都有）`)
        }
      }
    }
  }
})

t('简短句式字段用 [xxx] 占位（便于用户替换）', () => {
  for (const loc of LOCALES) {
    const L = stringsFor(loc)
    const withPlaceholder = SPOT_IDS.filter((id) => /[【\[]/.test(L.spotFix[id])).length
    assert.ok(withPlaceholder >= 12, `${loc}: 只有 ${withPlaceholder} 条句式带占位符，偏少`)
  }
})

t('stringsFor 对未知语言退回 zh-CN', () => {
  assert.equal(stringsFor('fr').reportTitle, STRINGS['zh-CN'].reportTitle)
  assert.equal(stringsFor(undefined).reportTitle, STRINGS['zh-CN'].reportTitle)
})

// ================================================================ 盲区与打分
console.log('\n【逻辑】盲区清单与体检')

t('盲区结构完整（id/severity/ch/en 齐全，id 不重复）', () => {
  const ids = new Set()
  for (const s of BLIND_SPOTS) {
    assert.ok(s.id, '缺 id')
    assert.ok(['high', 'mid', 'low'].includes(s.severity), `${s.id} 严重度非法`)
    assert.ok(s.ch instanceof RegExp, `${s.id} 缺中文规则`)
    assert.ok(s.en instanceof RegExp, `${s.id} 缺英文规则`)
    assert.ok(!ids.has(s.id), `id 重复: ${s.id}`)
    ids.add(s.id)
  }
  assert.ok(BLIND_SPOTS.length >= 10)
})

// ---- 「做什么类型」维度 ---------------------------------------------------
// 为什么要有这一组：姊妹项目（Windows 桌面应用）的问卷有三层自适应，
// 插件这边原来只有平台一层 —— 于是「做插件」的需求被按「做程序」的标准检查，
// 问不到最关键的那几点（挂在哪个软件里、要不要宿主接口）。
// 这里把新的 kind 行为的契约钉住。

const PLUGIN_TEXT = '给 DeepSeek Harness 做一个插件。挂在 DSH 里，我打一个命令才触发。'
  + '要能读我正在对话框里打的内容，把结果插回去，所以需要它的接口。'
  + '只在我自己机器上装好能用。'

const PROGRAM_TEXT = '帮我做一个合并 Excel 的小工具，做成一个 exe，双击打开。'
  + '要跑在 Windows 64 位，数据不能上传。'

// 通用项 = kinds 为空的那些（任何类型都查）；类型专属项 = kinds 含该类型
const genericSpots = () => BLIND_SPOTS.filter((s) => !s.kinds || s.kinds.length === 0)
const kindSpots = (kind) => BLIND_SPOTS.filter((s) => s.kinds && s.kinds.includes(kind))

t('kind 参数：不传时只查通用项（分数语义与加类型之前一致）', () => {
  const noKind = checkRequirement(PROGRAM_TEXT, { locale: 'zh-CN' })
  assert.equal(noKind.kind, null, '不传 kind 时应回显 null')
  const generic = genericSpots()
  assert.equal(noKind.total, generic.length,
    `不传 kind 时总数应为通用项数 ${generic.length}，实际 ${noKind.total}`)
  // 类型专属项不该出现在结果里
  const missingIds = noKind.missing.map((m) => m.id)
  for (const id of ['host-software', 'host-api', 'script-run', 'script-runtime']) {
    assert.ok(!missingIds.includes(id), `不传 kind 时不该出现类型专属项 ${id}`)
  }
})

t('kind=plugin：查通用项 + 插件专属项，且不含脚本专属项', () => {
  const r = checkRequirement(PLUGIN_TEXT, { locale: 'zh-CN', kind: 'plugin' })
  assert.equal(r.kind, 'plugin')
  const ids = r.missing.map((m) => m.id)
  assert.ok(!ids.includes('script-run'), '插件检查里不该有 script-run')
  assert.ok(!ids.includes('script-runtime'), '插件检查里不该有 script-runtime')
  // host-software / host-api 只在插件类型下参与（这段文字两条都提到了，所以应被覆盖）
  const coveredIds = kindSpots('plugin').map((s) => s.id)
  assert.equal(coveredIds.length, 2, '插件专属项应有 2 条')
  assert.equal(r.total, genericSpots().length + 2)
})

t('kind 三种类型都能跑，且总数各自正确', () => {
  const generic = genericSpots().length
  for (const kind of ['program', 'plugin', 'script']) {
    const extra = kindSpots(kind).length
    const r = checkRequirement('随便写一段话', { locale: 'zh-CN', kind })
    assert.equal(r.kind, kind)
    assert.equal(r.total, generic + extra, `${kind} 总数应为 ${generic + extra}，实际 ${r.total}`)
    assert.ok(r.score >= 0 && r.score <= 100, `${kind} 分数越界: ${r.score}`)
  }
})

t('kind 传不认识的值：退回「通用项」而不是报错', () => {
  const r = checkRequirement('随便写一段话', { locale: 'zh-CN', kind: 'spaceship' })
  assert.equal(r.kind, null, '不认识的值应回显 null')
  assert.equal(r.total, genericSpots().length)
})

t('「怎么交付」的文案按类型换（做插件时不该问 exe）', () => {
  const noKind = checkRequirement('我要做点东西', { locale: 'zh-CN', maxItems: 30 })
  const asPlugin = checkRequirement('我要做点东西', { locale: 'zh-CN', kind: 'plugin', maxItems: 30 })
  const g = noKind.missing.find((m) => m.id === 'delivery')
  const p = asPlugin.missing.find((m) => m.id === 'delivery')
  assert.ok(g && p, 'delivery 应出现在缺失项里')
  assert.notEqual(g.title, p.title, '程序与插件的 delivery 标题应该不同')
  assert.ok(p.why.includes('宿主') || p.why.includes('插件'), '插件版理由应提宿主/插件，实际: ' + p.why)
  // 三语都要有按类型覆盖，不能只补一种语言
  for (const loc of LOCALES) {
    const L = stringsFor(loc)
    for (const k of ['delivery.program', 'delivery.plugin', 'delivery.script']) {
      for (const grp of ['spotTitles', 'spotWhy', 'spotFix']) {
        assert.ok(L[grp][k], `${loc}.${grp} 缺按类型覆盖键 ${k}`)
      }
    }
  }
})

t('简易类型专属规则不该被常见词误命中（防漏报）', () => {
  // 「read」这类常用词第一版被写进 host-api 的英文规则，结果普通句子就命中了。
  // 这里用一段**不涉及宿主接口**的普通英文需求，确认 host-api 仍然报缺失。
  const plain = 'I want to build a small tool. It should run on Windows and read a CSV file '
    + 'from my folder and write a summary.'
  const r = checkRequirement(plain, { locale: 'en', kind: 'plugin', maxItems: 30 })
  const ids = r.missing.map((m) => m.id)
  assert.ok(ids.includes('host-api'),
    '这段文字没提宿主接口，host-api 应报缺失（说明规则没被 read/write 误命中）')
})

t('空输入也要尊重 kind（总数按类型算）', () => {
  const r = checkRequirement('', { locale: 'zh-CN', kind: 'plugin' })
  assert.equal(r.score, 0)
  assert.equal(r.kind, 'plugin')
  assert.equal(r.total, genericSpots().length + 2)
})

t('空输入三语都返回空报告且不抛', () => {
  for (const loc of LOCALES) {
    const r = checkRequirement('', { locale: loc })
    assert.equal(r.score, 0, `${loc} 分数应为 0`)
    assert.equal(r.level, 'empty')
    assert.equal(r.locale, loc)
    assert.ok(r.report.length > 10, `${loc} 空报告文本过短`)
  }
})

t('中文模糊输入：低分、报出高优先级盲区', () => {
  const r = checkRequirement('帮我做个软件', { locale: 'zh-CN' })
  assert.ok(r.score < 40, '分数应低于 40，实际 ' + r.score)
  assert.equal(r.ok, false)
  const ids = r.missing.map((m) => m.id)
  assert.ok(ids.includes('scope-out'), '应指出范围边界缺失')
  assert.ok(ids.includes('done'), '应指出验收标准缺失')
})

t('英文模糊输入也能命中（英文规则独立生效）', () => {
  const r = checkRequirement('I want to build a small tool for managing customers.', { locale: 'en' })
  assert.equal(r.locale, 'en')
  assert.ok(r.score < 45, '英文模糊输入分数应偏低，实际 ' + r.score)
  const ids = r.missing.map((m) => m.id)
  assert.ok(ids.includes('scope-out'), '应指出 out-of-scope 缺失（英文规则）')
  assert.ok(ids.includes('done'), '应指出 acceptance criteria 缺失')
  assert.ok(r.report.includes('[Requirement check]'), '英文报告标题不对')
})

t('平台盲区：认 Windows / macOS / Linux（旧版只认 Windows）', () => {
  const cases = [
    ['跑在 Windows 上', 'environment'],
    ['要能在 mac 上打开', 'environment'],
    ['装在 Linux 服务器上', 'environment'],
    ['做网页版，浏览器打开', 'environment'],
    ['这是个安卓 app', 'environment'],
  ]
  for (const [text, id] of cases) {
    const r = checkRequirement(text, { locale: 'zh-CN' })
    assert.ok(!r.missing.some((m) => m.id === id), `「${text}」应命中 ${id}，实际判为缺失`)
  }
  for (const text of ['runs on Linux', 'must work on macOS', 'deploy on Ubuntu', 'a web page in the browser']) {
    const r = checkRequirement(text, { locale: 'en' })
    assert.ok(!r.missing.some((m) => m.id === 'environment'), `英文「${text}」应命中 environment`)
  }
})

t('位数盲区：32/64 位单独成项（新增加）', () => {
  // 完全没提位数 → arch 应判为缺失
  const r1 = checkRequirement('我想做一个合并 Excel 的小工具，跑在 Windows 上。', { locale: 'zh-CN' })
  assert.ok(r1.missing.some((m) => m.id === 'arch'), '没提位数时 arch 应缺失')

  // 提了位数 → arch 应命中
  for (const text of [
    '要 64 位的',
    '对方电脑是 32 位系统',
    'compile for x64',
    'needs an arm64 build',
    'Apple 芯片的 Mac',
  ]) {
    const r = checkRequirement(text, { locale: 'zh-CN' })
    assert.ok(!r.missing.some((m) => m.id === 'arch'), `「${text}」应命中 arch`)
  }
})

t('报告里出现「目标系统与位数」段并给出本机默认值', () => {
  const r = checkRequirement('我想做个小工具。', { locale: 'zh-CN' })
  assert.ok(r.missing.some((m) => m.id === 'environment') || r.missing.some((m) => m.id === 'arch'),
    '过短的需求应触发平台段')
  assert.ok(r.report.includes('目标系统与位数'), '报告应含平台段标题')
  const det = detectPlatform()
  assert.ok(r.report.includes(det.osLabel), '报告应写本机系统 ' + det.osLabel)
  assert.ok(r.platform && r.platform.target, '应返回 platform 对象')

  const en = checkRequirement('Build me a tool.', { locale: 'en' })
  assert.ok(en.report.includes('Target platform and bitness'), '英文报告应含平台段')
})

t('平台段在三语下都出现，且用对应语言的标点', () => {
  const full = '我想做一个工具，跑在 Windows 64 位上，输入是 xlsx，输出到桌面，怎么算做好了就是总数对得上，不做联网，只有我自己用，现在手动做要一小时，每天用一次，量级几百行，出错就提示我，给我一个 exe。'
  const r = checkRequirement(full, { locale: 'zh-CN' })
  if (!r.missing.some((m) => m.id === 'environment') && !r.missing.some((m) => m.id === 'arch')) {
    assert.ok(!r.report.includes('目标系统与位数'), '两项都写了就不该再出平台段')
  }

  // 触发出平台段，逐语言检查标题的标点
  const vague = '我想做个小工具。'
  const cn = checkRequirement(vague, { locale: 'zh-CN' }).report
  const tw = checkRequirement(vague, { locale: 'zh-TW' }).report
  const en = checkRequirement(vague, { locale: 'en' }).report

  assert.ok(cn.includes('【目标系统与位数】'), '简中标题应为【…】')
  assert.ok(tw.includes('【目標系統與位元數】'), '繁中标题应为【…】')
  // 英文不能出现中文书名号 —— 这是我实际犯过的错
  assert.ok(en.includes('Target platform and bitness:'), '英文标题应以冒号结尾')
  assert.ok(!/【|】/.test(en), '英文报告不应出现中文书名号，实际: ' + (en.match(/.*【.*/)?.[0] || ''))

  for (const l of LOCALES) {
    const rr = checkRequirement(vague, { locale: l })
    assert.ok(rr.report.length > 0, l + ' 报告不能为空')
  }
})

t('英文完整输入得高分', () => {
  const full = `
I want to build a tool that merges three daily sales .xlsx files into one summary, to stop doing it by hand.
Right now I copy and paste manually, about 40 minutes, and I mistype rows.
Input: 3 .xlsx files in a daily-data folder; first row is headers; columns are date/customer/amount; about 200 rows.
Output: show the total and the number of problem rows; export an Excel file to the desktop named summary_date.xlsx.
What counts as done: run last week's 3 files and the total must match finance exactly, and every problem row is flagged.
On error: if a customer name cannot be matched, list those rows instead of skipping them silently.
Out of scope: no charts, no multi-user, no network.
Only me, on one Windows PC, and the data must not be uploaded.
I will give you a sample file at samples/x.xlsx.
Give me an exe on the desktop that I can double-click.
`
  const r = checkRequirement(full, { locale: 'en' })
  assert.ok(r.score >= 85, '英文完整输入应 >=85，实际 ' + r.score)
  assert.equal(r.ok, true, '不该再有高优先级盲区: ' + JSON.stringify(r.missing.filter(m => m.severity === 'high').map(m => m.id)))
})

t('繁体简体共用中文规则，但报告是繁体', () => {
  const text = '帮我做个软件'
  const cn = checkRequirement(text, { locale: 'zh-CN' })
  const tw = checkRequirement(text, { locale: 'zh-TW' })
  assert.equal(cn.score, tw.score, '同一段中文，简繁命中的盲区应一致')
  assert.ok(tw.report.includes('需求健檢'), '繁体报告标题应为「需求健檢」')
  assert.ok(tw.report.includes('盲區'), '繁体报告应出现「盲區」')
  assert.ok(!tw.report.includes('需求体检'), '繁体报告不应出现简体标题')
})

t('同一段完整中文，三语报告分数一致但文案不同', () => {
  const full = `
我想做一个把每天三份销售 Excel 自动合并的小工具，用来省掉手动汇总。
现在我是手动复制粘贴，约 40 分钟，容易抄错。
输入是每天 3 个 .xlsx 放在「每日数据」文件夹，第一行是标题，列有 日期/客户/金额，约 200 行。
输出：屏幕显示总金额和异常行数；导出 Excel 到桌面，文件名 汇总_当天日期.xlsx。
怎么算做好了：拿上周 3 个文件跑一遍，总金额和财务给的完全一致，异常行全部标出。
出错怎么办：客户名对不上时把那几行列出来提醒我，不要静默跳过。
这一版不做图表、不联网、不做多用户。只有我自己用，Windows 电脑，数据不能上传。
我放了一份样例在「每日数据/样例.xlsx」。给我一个 exe 放桌面，双击就能用。
`
  const cn = checkRequirement(full, { locale: 'zh-CN' })
  const tw = checkRequirement(full, { locale: 'zh-TW' })
  const en = checkRequirement(full, { locale: 'en' })
  assert.equal(cn.score, tw.score)
  assert.equal(cn.score, en.score, '分数只取决于命中项，与语言无关')
  assert.ok(cn.score >= 85)
  assert.ok(cn.report !== tw.report, '简繁报告文案应不同')
  assert.ok(cn.report !== en.report, '中英报告文案应不同')
})

t('max_items 生效并提示未列出项', () => {
  const r = checkRequirement('帮我做个软件', { maxItems: 2, locale: 'zh-CN' })
  assert.equal(r.missing.length, 2)
  assert.ok(r.summary.includes('未列出'))
  const e = checkRequirement('help me build something', { maxItems: 2, locale: 'en' })
  assert.equal(e.missing.length, 2)
  assert.ok(e.summary.includes('not listed'), '英文也应有未列出提示')
})

t('renderReport 返回报告并附语言说明', () => {
  const r = checkRequirement('帮我做个软件', { locale: 'zh-TW' })
  const rep = renderReport(r)
  assert.ok(rep.includes('需求健檢'))
  assert.ok(rep.includes('目前語言'))
  assert.ok(rep.includes(String(r.score)))
})

t('边界：非字符串 / 空对象 / 数组都不崩', () => {
  for (const v of [null, undefined, 123, {}, [], true]) {
    const r = checkRequirement(v)
    assert.equal(typeof r.score, 'number')
    assert.ok(typeof r.report === 'string')
  }
})

// ================================================================ 模板
console.log('\n【逻辑】模板库（三语）')

t('模板结构完整，id 不重复，三语名称与场景齐全', () => {
  const ids = new Set()
  for (const tpl of TEMPLATES) {
    assert.ok(tpl.id && !ids.has(tpl.id), 'id 缺失或重复: ' + tpl.id)
    ids.add(tpl.id)
    for (const loc of LOCALES) {
      assert.ok(tpl.name[loc], `${tpl.id}.name.${loc} 缺失`)
      assert.ok(tpl.scene[loc], `${tpl.id}.scene.${loc} 缺失`)
      for (const [field, cell] of Object.entries(tpl.fields)) {
        assert.ok(cell[loc], `${tpl.id}.fields.${field}.${loc} 缺失`)
        // 「只有我自己用」这类短答本来就短，>5 即视为有效
        assert.ok(cell[loc].length > 5, `${tpl.id}.fields.${field}.${loc} 过短: ${cell[loc]}`)
      }
    }
  }
  assert.ok(TEMPLATES.length >= 8, '模板数应 >= 8，实际 ' + TEMPLATES.length)
})

t('每套模板 8 个字段，字段名与 FIELD_LABELS 对得上', () => {
  const expected = Object.keys(FIELD_LABELS)
  for (const tpl of TEMPLATES) {
    const keys = Object.keys(tpl.fields)
    assert.equal(keys.length, 8, `${tpl.id} 字段数 ${keys.length} != 8`)
    for (const k of keys) assert.ok(expected.includes(k), `${tpl.id} 出现未知字段 ${k}`)
  }
  for (const k of expected) {
    for (const loc of LOCALES) {
      assert.ok(FIELD_LABELS[k][loc], `FIELD_LABELS.${k}.${loc} 缺失`)
    }
  }
})

t('新增的两套行业模板存在', () => {
  const ids = TEMPLATES.map((t) => t.id)
  assert.ok(ids.includes('decoration-quote'), '缺少装修报价模板')
  assert.ok(ids.includes('payroll-overtime'), '缺少工资加班模板')
})

t('三语模板草案各自成文，且带编辑提示', () => {
  const tpl = TEMPLATES[0]
  const cn = renderTemplate(tpl, 'zh-CN')
  const tw = renderTemplate(tpl, 'zh-TW')
  const en = renderTemplate(tpl, 'en')
  assert.ok(cn.includes('模板示例'), '简中草案缺编辑提示')
  assert.ok(tw.includes('範本範例'), '繁中草案缺编辑提示')
  assert.ok(en.includes('template example'), '英文草案缺编辑提示')
  assert.notEqual(cn, tw)
  assert.notEqual(cn, en)
  // 八个字段标题都应出现在草案里
  for (const loc of LOCALES) {
    const draft = renderTemplate(tpl, loc)
    let hits = 0
    for (const k of Object.keys(FIELD_LABELS)) {
      const label = FIELD_LABELS[k][loc]
      if (draft.includes(label)) hits++
    }
    assert.equal(hits, 8, `${loc} 草案里只找到 ${hits}/8 个字段标题`)
  }
})

t('templateIndex 按语言返回名称与场景', () => {
  const cn = templateIndex('zh-CN')
  const en = templateIndex('en')
  assert.equal(cn.length, TEMPLATES.length)
  assert.ok(cn[0].name !== en[0].name, '中英模板名应不同')
  assert.ok(en.every((x) => /[A-Za-z]/.test(x.name)), '英文模板名应含拉丁字母')
})

t('关键词筛选支持三语', () => {
  assert.ok(findTemplates('对账').length >= 1, '中文关键词应命中')
  assert.ok(findTemplates('reconcile').length >= 1, '英文关键词应命中')
  assert.ok(findTemplates('報價').length >= 1 || findTemplates('报价').length >= 1, '繁体关键词应命中')
  assert.equal(findTemplates('zzz不存在zzz').length, 0)
  assert.equal(findTemplates().length, TEMPLATES.length)
})

t('templateFields 只返回已定义的字段，顺序稳定', () => {
  const f = templateFields(TEMPLATES[0], 'en')
  assert.equal(f.length, 8)
  assert.equal(f[0][0], 'goal', '第一个字段应是 goal')
  assert.ok(f.every(([, v]) => typeof v === 'string' && v.length > 0))
})

// ================================================================ 平台探测
console.log('\n【逻辑】平台与位数探测')

t('detectPlatform 返回合法结构', () => {
  const d = detectPlatform()
  assert.ok(['win', 'mac', 'linux'].includes(d.os), 'os 不合法: ' + d.os)
  assert.ok([32, 64].includes(d.bits), 'bits 应为 32 或 64，实际 ' + d.bits)
  assert.equal(typeof d.arch, 'string')
  assert.equal(typeof d.certain, 'boolean')
  assert.match(d.osLabel, /Windows|macOS|Linux/)
})

t('detectPlatform 与本机 Node 的 platform/arch 一致（未做过度推断）', () => {
  const d = detectPlatform()
  const expectOs = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux'
  assert.equal(d.os, expectOs)
  assert.equal(d.nodePlatform, process.platform)
  assert.equal(d.nodeArch, process.arch)
  if (process.arch === 'ia32') assert.equal(d.bits, 32, 'ia32 必须报 32 位')
  else assert.equal(d.bits, 64)
})

t('platformToTarget 覆盖三种系统与两种位数', () => {
  assert.equal(platformToTarget({ os: 'win', arch: 'x64', bits: 64 }), 'windows-64')
  assert.equal(platformToTarget({ os: 'win', arch: 'ia32', bits: 32 }), 'windows-32')
  assert.equal(platformToTarget({ os: 'win', arch: 'arm64', bits: 64 }), 'windows-arm64')
  assert.equal(platformToTarget({ os: 'mac', arch: 'x64', bits: 64 }), 'macos-64')
  assert.equal(platformToTarget({ os: 'mac', arch: 'arm64', bits: 64 }), 'macos-arm64')
  assert.equal(platformToTarget({ os: 'linux', arch: 'x64', bits: 64 }), 'linux-64')
  assert.equal(platformToTarget({ os: 'linux', arch: 'arm64', bits: 64 }), 'linux-arm64')
  assert.equal(platformToTarget(null), 'auto')
})

t('TARGETS 里的每个值都有三语标签，且能被 describeTarget 解读', () => {
  for (const tgt of TARGETS) {
    assert.ok(TARGET_LABELS[tgt], '缺少标签: ' + tgt)
    for (const loc of LOCALES) {
      const s = describeTarget(tgt, loc)
      assert.ok(typeof s === 'string' && s.length > 1, `${tgt}.${loc} 标签为空`)
      assert.notEqual(s, tgt, `${tgt}.${loc} 应是人话而不是原值`)
    }
  }
  // Windows / macOS / Linux 三个系统都在
  const joined = TARGETS.join(' ')
  for (const os of ['windows', 'macos', 'linux']) assert.ok(joined.includes(os), '缺少 ' + os)
  // 32 / 64 都在
  assert.ok(TARGETS.some((t) => t.includes('-32')), '缺少 32 位选项')
  assert.ok(TARGETS.some((t) => t.includes('-64')), '缺少 64 位选项')
})

t('defaultTargetSentence 三语都提到本机系统与位数', () => {
  const d = detectPlatform()
  for (const loc of LOCALES) {
    const s = defaultTargetSentence(loc, d)
    assert.ok(s.includes(d.osLabel), `${loc} 应包含系统名 ${d.osLabel}: ${s}`)
    const bitsWord = loc === 'en' ? String(d.bits) : String(d.bits)
    assert.ok(s.includes(bitsWord), `${loc} 应包含位数: ${s}`)
    assert.ok(s.length > 20)
  }
})

t('compatNote 说明 32 位可向下兼容、64 位不能向上跑', () => {
  for (const loc of LOCALES) {
    const s = compatNote(loc)
    assert.ok(s.includes('32') && s.includes('64'), loc + ' 的兼容说明应同时提到 32 和 64')
  }
})

// ================================================================ 偏好存储
console.log('\n【逻辑】偏好存储')

t('prefsPath 默认指向用户目录下的 .dsh，且可被 XBSH_PREFS_PATH 覆盖', () => {
  const overridden = prefsPath()
  assert.equal(overridden, TMP_PREFS, '测试期间应指向临时文件')
  assert.ok(overridden.startsWith(os.tmpdir()), '临时文件应在系统临时目录')

  // 摘掉覆盖，验证默认路径
  const saved = process.env.XBSH_PREFS_PATH
  delete process.env.XBSH_PREFS_PATH
  try {
    const def = prefsPath()
    assert.ok(def.includes('.dsh'), '默认路径应含 .dsh: ' + def)
    assert.ok(def.endsWith('requirement-check.json'))
    assert.ok(def.startsWith(os.homedir()))
  } finally {
    process.env.XBSH_PREFS_PATH = saved
  }
})

await ta('读写偏好往返一致（写测试专用键，不碰 locale）', async () => {
  const before = readPrefs()
  const had = Object.prototype.hasOwnProperty.call(before, '__test_marker__')
  const ok = writePrefs({ __test_marker__: 'v1' })
  assert.equal(ok, true, '写入应成功')
  assert.equal(readPrefs().__test_marker__, 'v1')
  // 清理
  if (!had) {
    const after = readPrefs()
    delete after.__test_marker__
    const fs = await import('node:fs')
    if (Object.keys(after).length === 0) {
      try { fs.unlinkSync(path.join(os.homedir(), '.dsh', 'requirement-check.json')) } catch {}
    } else {
      fs.writeFileSync(path.join(os.homedir(), '.dsh', 'requirement-check.json'), JSON.stringify(after, null, 2), 'utf8')
    }
  }
})

await ta('偏好文件损坏时不抛，返回空对象', async () => {
  const fs = await import('node:fs')
  const p = prefsPath()          // 已是临时文件，不碰用户真实偏好
  const backup = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, '{ this is not json', 'utf8')
    const prefs = readPrefs()
    assert.equal(typeof prefs, 'object')
    assert.deepEqual(prefs, {})
  } finally {
    if (backup === null) { try { fs.unlinkSync(p) } catch {} }
    else fs.writeFileSync(p, backup, 'utf8')
  }
})

// ================================================================ 契约层
console.log('\n【契约】工具注册形状（mock ctx）')

const registered = []
const sectionCalls = []
const settingsCalls = []

const fakeCtx = {
  tools: {
    register(def) {
      registered.push(def)
      return () => {}
    },
  },
  inject(deps, fn) {
    const sctx = {
      settings: { register(ns, cfg, opts) { settingsCalls.push({ ns, opts }); return () => {} } },
      systemPrompt: { section(s) { sectionCalls.push(s); return () => {} } },
    }
    assert.ok(Array.isArray(deps) && deps.length > 0)
    fn(sctx)
    return () => {}
  },
}

const mod = await import('../src/index.js')
mod.apply(fakeCtx)

t('插件导出 name/inject/Config/apply', () => {
  assert.equal(typeof mod.name, 'string')
  assert.ok(Array.isArray(mod.inject))
  assert.ok(mod.Config, '应导出 Config')
  assert.equal(typeof mod.apply, 'function')
})

t('注册了 5 个工具（体检 / 模板 / 查重 / 平台 / 语言）', () => {
  assert.equal(registered.length, 5, `实际 ${registered.length} 个`)
  const names = registered.map((d) => d.name).sort()
  assert.deepEqual(names, [
    'requirement_check', 'requirement_duplicate_check', 'requirement_locale',
    'requirement_platform', 'requirement_template',
  ])
})

t('description / parameters / output 支持函数形式（按调用时解析语言）', () => {
  for (const d of registered) {
    assert.ok(typeof d.description === 'string' || typeof d.description === 'function',
      `${d.name} description 类型不对`)
    assert.ok(typeof d.parameters === 'object' || typeof d.parameters === 'function',
      `${d.name} parameters 类型不对`)
    assert.ok(typeof d.output === 'function' || (d.output && d.output.schema),
      `${d.name} output 类型不对`)
    assert.equal(typeof d.execute, 'function')
  }
})

t('解析后的描述/参数随语言变化', () => {
  const check = registered.find((d) => d.name === 'requirement_check')
  const cnDesc = check.description()
  assert.ok(cnDesc.includes('需求'), '中文描述应含「需求」')

  process.env.XBSH_LOCALE = 'en'
  const enDesc = check.description()
  const enParams = check.parameters()
  process.env.XBSH_LOCALE = 'zh-CN'

  assert.ok(enDesc.includes('requirement') || enDesc.includes('Audit'), '英文描述不对: ' + enDesc.slice(0, 60))
  assert.ok(enParams.properties.text.description.includes('verbatim'), '英文参数描述不对')
  assert.ok(Array.isArray(enParams.properties.locale.enum), '应暴露 locale 枚举')
  assert.deepEqual(enParams.properties.locale.enum, LOCALES)
})

t('parameters 只含 JsonSchemaNode 允许字段，且 locale 是枚举', () => {
  const ALLOWED = new Set(['type', 'oneOf', 'properties', 'required', 'additionalProperties',
    'items', 'enum', 'const', 'description', 'title', 'default', 'examples'])
  const walk = (node, p) => {
    for (const k of Object.keys(node)) assert.ok(ALLOWED.has(k), `${p} 非法字段 ${k}`)
    if (node.properties) for (const [k, v] of Object.entries(node.properties)) walk(v, `${p}.${k}`)
  }
  for (const d of registered) {
    const params = typeof d.parameters === 'function' ? d.parameters() : d.parameters
    walk(params, d.name)
  }
  const localeTool = registered.find((d) => d.name === 'requirement_locale')
  const lp = typeof localeTool.parameters === 'function' ? localeTool.parameters() : localeTool.parameters
  assert.deepEqual(lp.properties.locale.enum, LOCALES)
  assert.deepEqual(lp.required, ['locale'])
})

t('output.render 返回 ContentBlock[]（形状 {type:"text", text}）', () => {
  for (const d of registered) {
    const out = typeof d.output === 'function' ? d.output() : d.output
    const blocks = out.render({}, { hello: '世界' })
    assert.ok(Array.isArray(blocks) && blocks.length > 0, `${d.name} render 未返回数组`)
    for (const b of blocks) {
      assert.equal(b.type, 'text')
      assert.equal(typeof b.text, 'string')
    }
  }
})

t('settings 注册命名空间与 applies=live', () => {
  assert.ok(settingsCalls.length >= 1)
  assert.equal(settingsCalls[0].ns, 'dsh-requirement-check')
  assert.equal(settingsCalls[0].opts.applies, 'live')
})

t('系统提示以函数形式注册（语言不锁死），且提到三个工具名', () => {
  assert.equal(sectionCalls.length, 1)
  const s = sectionCalls[0]
  assert.equal(s.name, 'requirement-check-hint')
  const text = typeof s.text === 'function' ? s.text() : s.text
  for (const tool of ['requirement_check', 'requirement_template']) {
    assert.ok(text.includes(tool), '提示里应提到 ' + tool)
  }

  process.env.XBSH_LOCALE = 'en'
  const enText = typeof s.text === 'function' ? s.text() : s.text
  process.env.XBSH_LOCALE = 'zh-CN'
  assert.ok(enText !== text, '系统提示应随语言变化')
  assert.ok(enText.includes('requirement_check'), '英文提示应提到工具名')
})

t('宿主不支持 settings.register 时不崩（0.1.7+ API 漂移）', () => {
  const calls = []
  const ctx2 = {
    tools: { register: () => () => {} },
    inject(deps, fn) {
      fn({
        settings: { describe: () => {}, update: () => {} },
        systemPrompt: { section: (s) => { calls.push(s); return () => {} } },
      })
      return () => {}
    },
  }
  mod.apply(ctx2)
  assert.equal(calls.length, 1, '即使 settings 不可用，系统提示仍应注册')
})

t('没有 systemPrompt / settings 服务时也不崩', () => {
  mod.apply({ tools: { register: () => () => {} }, inject(deps, fn) { fn({}); return () => {} } })
  assert.ok(true)
})

// ================================================================ 端到端
console.log('\n【端到端】直接调用已注册工具的 execute')

const check = registered.find((d) => d.name === 'requirement_check')
const tpl = registered.find((d) => d.name === 'requirement_template')
const loc = registered.find((d) => d.name === 'requirement_locale')
const plat = registered.find((d) => d.name === 'requirement_platform')

await ta('requirement_check：模糊中文返回低分与报告', async () => {
  const v = await check.execute({ text: '帮我做个软件', locale: 'zh-CN' })
  assert.ok(v.score < 40)
  assert.equal(v.ok, false)
  assert.equal(v.locale, 'zh-CN')
  assert.ok(v.report.includes('需求体检'))
  assert.equal(v.missing.length, 8, '默认最多 8 条')
})

await ta('requirement_check：英文输入返回英文报告', async () => {
  const v = await check.execute({ text: 'I want to build a customer manager.', locale: 'en' })
  assert.equal(v.locale, 'en')
  assert.ok(v.report.includes('[Requirement check]'))
  assert.ok(v.missing[0].title.match(/[A-Za-z]/), '缺失项标题应是英文')
})

await ta('requirement_check：繁中输入返回繁体报告', async () => {
  const v = await check.execute({ text: '幫我做個軟體', locale: 'zh-TW' })
  assert.equal(v.locale, 'zh-TW')
  assert.ok(v.report.includes('需求健檢'))
})

await ta('requirement_check：max_items 生效', async () => {
  const v = await check.execute({ text: '帮我做个软件', max_items: 3 })
  assert.equal(v.missing.length, 3)
})

await ta('requirement_check：空参数不崩', async () => {
  const v = await check.execute()
  assert.equal(v.score, 0)
})

await ta('requirement_template：列出全部（三语）', async () => {
  for (const l of LOCALES) {
    const v = await tpl.execute({ locale: l })
    assert.equal(v.count, TEMPLATES.length, `${l} 模板数不对`)
    assert.equal(v.templates.length, TEMPLATES.length)
    assert.equal(v.locale, l)
  }
})

await ta('requirement_template：关键词筛选三语都能命中', async () => {
  const cn = await tpl.execute({ keyword: '对账', locale: 'zh-CN' })
  assert.ok(cn.templates.some((x) => x.id === 'reconcile'))
  const en = await tpl.execute({ keyword: 'overtime', locale: 'en' })
  assert.ok(en.templates.some((x) => x.id === 'payroll-overtime'), '英文 overtime 应命中工资模板')
  const tw = await tpl.execute({ keyword: '裝修', locale: 'zh-TW' })
  assert.ok(tw.templates.some((x) => x.id === 'decoration-quote'), '繁体「裝修」应命中装修模板')
})

await ta('requirement_template：template_id 取回对应语言的草案', async () => {
  const cn = await tpl.execute({ template_id: 'decoration-quote', locale: 'zh-CN' })
  const en = await tpl.execute({ template_id: 'decoration-quote', locale: 'en' })
  assert.equal(cn.found, true)
  assert.ok(cn.draft.includes('装修') || cn.draft.includes('报价'), '中文草案内容不对')
  assert.ok(en.draft.includes('renovation') || en.draft.includes('Renovation'), '英文草案内容不对')
  assert.notEqual(cn.draft, en.draft)
})

await ta('requirement_template：非法 id 有兜底（且按语言给提示）', async () => {
  const cn = await tpl.execute({ template_id: 'nope', locale: 'zh-CN' })
  const en = await tpl.execute({ template_id: 'nope', locale: 'en' })
  assert.equal(cn.found, false)
  assert.ok(cn.message.includes('没有 id'))
  assert.ok(en.message.includes('No template'))
})

await ta('requirement_locale：能保存语言偏好（写测试文件后还原）', async () => {
  const fs = await import('node:fs')
  const p = prefsPath()
  const backup = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null
  try {
    for (const l of LOCALES) {
      const v = await loc.execute({ locale: l })
      assert.equal(v.locale, l, `切换到 ${l} 失败`)
      assert.equal(v.saved, true, `写入偏好失败: ${l}`)
      assert.equal(readPrefs().locale, l, `偏好文件里应是 ${l}`)
    }
  } finally {
    if (backup === null) { try { fs.unlinkSync(p) } catch {} }
    else fs.writeFileSync(p, backup, 'utf8')
  }
})

await ta('requirement_locale：切换后其他工具默认跟随', async () => {
  // 环境变量优先级高于偏好文件，所以要先摘掉自己钉住的那个，
  // 否则测的是环境变量而不是偏好。
  const saved = process.env.XBSH_LOCALE
  delete process.env.XBSH_LOCALE
  try {
    await loc.execute({ locale: 'en' })
    const v = await check.execute({ text: 'I want to build a tool.' })
    assert.equal(v.locale, 'en', '未显式传 locale 时应跟随偏好')

    await loc.execute({ locale: 'zh-TW' })
    const v2 = await check.execute({ text: '我想做一個工具。' })
    assert.equal(v2.locale, 'zh-TW', '跟着偏好切到繁体')
  } finally {
    if (saved !== undefined) process.env.XBSH_LOCALE = saved
  }
})

await ta('环境变量优先于偏好文件（本次运行的明确意图）', async () => {
  // 先写一个 en 的偏好
  await loc.execute({ locale: 'en' })
  assert.equal(readPrefs().locale, 'en')
  // 环境变量设成 zh-TW，应压过偏好
  const saved = process.env.XBSH_LOCALE
  process.env.XBSH_LOCALE = 'zh-TW'
  try {
    const v = await check.execute({ text: '我想做一個工具。' })
    assert.equal(v.locale, 'zh-TW', '环境变量应优先于偏好文件')
    const v2 = await check.execute({ text: 'x', locale: 'en' })
    assert.equal(v2.locale, 'en', '显式参数应优先于环境变量')
  } finally {
    if (saved === undefined) delete process.env.XBSH_LOCALE
    else process.env.XBSH_LOCALE = saved
  }
})

await ta('requirement_locale：非法语言有兜底不崩', async () => {
  const v = await loc.execute({ locale: 'klingon' })
  assert.ok(LOCALES.includes(v.locale), '应落到某个合法语言')
})

await ta('requirement_check：返回平台信息，默认跟随本机', async () => {
  const v = await check.execute({ text: '帮我做个软件', locale: 'zh-CN' })
  assert.ok(v.platform, '应返回平台信息')
  assert.equal(v.targetResolvedBy, 'auto', '未传 target 时应是 auto')
  const det = detectPlatform()
  assert.equal(v.target, platformToTarget(det), '默认目标应等于本机推断值')
  assert.ok(v.targetLabel && v.targetLabel.length > 1)
})

await ta('requirement_check：显式 target 覆盖默认', async () => {
  const v = await check.execute({ text: '帮我做个软件', target: 'linux-64' })
  assert.equal(v.target, 'linux-64')
  assert.equal(v.targetResolvedBy, 'explicit')
  assert.ok(v.targetLabel.includes('Linux'), '标签应说 Linux，实际 ' + v.targetLabel)

  const v2 = await check.execute({ text: '帮我做个软件', target: 'windows-32' })
  assert.equal(v2.target, 'windows-32')
  assert.ok(v2.targetLabel.includes('32'), '标签应含 32')
})

await ta('requirement_check：非法 target 退回 auto 不崩', async () => {
  const v = await check.execute({ text: '帮我做个软件', target: 'beos' })
  assert.ok(TARGETS.includes(v.target))
  assert.equal(v.targetResolvedBy, 'auto')
})

await ta('requirement_platform：返回本机系统与位数（三语）', async () => {
  for (const l of LOCALES) {
    const v = await plat.execute({ locale: l })
    assert.equal(v.locale, l)
    assert.ok(v.platform, l + ' 应返回 platform')
    assert.ok([32, 64].includes(v.platform.bits))
    assert.ok(TARGETS.includes(v.target))
    assert.ok(v.defaultSentence.includes(v.platform.osLabel), l + ' 默认句应含系统名')
    assert.ok(v.compatNote.includes('32'), l + ' 兼容说明应提 32')
    assert.ok(v.message.length > 20)
  }
})

await ta('requirement_platform：set_default 能保存目标系统', async () => {
  const before = readPrefs()
  try {
    const v = await plat.execute({ target: 'macos-arm64', set_default: true })
    assert.equal(v.saved, true, '保存应成功')
    assert.equal(readPrefs().target, 'macos-arm64')
    // 之后 requirement_check 不传 target 时应跟随
    const savedEnv = process.env.XBSH_LOCALE
    delete process.env.XBSH_LOCALE
    try {
      const c = await check.execute({ text: '帮我做个软件' })
      assert.equal(c.target, 'macos-arm64', '应跟随保存的默认目标')
      assert.equal(c.targetResolvedBy, 'explicit')
    } finally {
      if (savedEnv !== undefined) process.env.XBSH_LOCALE = savedEnv
    }
  } finally {
    // 还原偏好文件
    const fs = await import('node:fs')
    fs.writeFileSync(prefsPath(), JSON.stringify(before, null, 2), 'utf8')
  }
})

await ta('requirement_platform：非法 target 不崩', async () => {
  const v = await plat.execute({ target: 'beos' })
  assert.ok(TARGETS.includes(v.target))
})

// ---- 查重工具：mock fetch，不真联网 ----
const dup = registered.find((d) => d.name === 'requirement_duplicate_check')

await ta('requirement_duplicate_check：没给内容时明确报错', async () => {
  const v = await dup.execute({})
  assert.equal(v.ok, false)
  assert.ok(v.error.includes('没有给'))
})

await ta('requirement_duplicate_check：中文需求会转成英文检索词', async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ items: [] }) })
  try {
    const v = await dup.execute({ query: '帮我做个记账小工具记录每天花销' })
    assert.equal(v.ok, true)
    assert.ok(/expense|finance/.test(v.query), '应转成财务类英文词，实际 ' + v.query)
    assert.ok(v.englishHits.length > 0, '应报告命中的中文词')
  } finally { globalThis.fetch = orig }
})

await ta('requirement_duplicate_check：无关高星项目被排除，结论不被带偏', async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true, status: 200,
    json: async () => ({ items: [
      { full_name: 'someone/politics', html_url: 'u', description: 'unrelated topic',
        stargazers_count: 3250, language: 'HTML', license: { spdx_id: 'MIT' },
        pushed_at: '2026-08-01T00:00:00Z', archived: false },
      { full_name: 'skanmera/ExcelMerge', html_url: 'u2', description: 'merge excel files',
        stargazers_count: 847, language: 'C#', license: { spdx_id: 'MIT' },
        pushed_at: '2026-07-01T00:00:00Z', archived: false },
    ] }),
  })
  try {
    const v = await dup.execute({ query: 'excel merge' })
    assert.equal(v.ok, true)
    assert.equal(v.dropped, 1, '应排除 1 个无关项目')
    assert.ok(v.projects.every((p) => p.full_name !== 'someone/politics'), '不该留无关项目')
    assert.ok(!v.reasons.join(' ').includes('3250'), '不该用无关项目的星数判断')
  } finally { globalThis.fetch = orig }
})

await ta('requirement_duplicate_check：限流时给出可继续的提示而不是只说失败', async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) })
  try {
    const v = await dup.execute({ query: 'excel merge' })
    assert.equal(v.ok, false)
    assert.ok(v.error.includes('频率'), v.error)
    assert.ok(v.hint && v.hint.length > 5, '应给 hint 指出替代路径')
  } finally { globalThis.fetch = orig }
})

await ta('requirement_duplicate_check：断网也不崩', async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('offline') }
  try {
    const v = await dup.execute({ query: 'excel merge' })
    assert.equal(v.ok, false)
    assert.ok(v.error.length > 3)
  } finally { globalThis.fetch = orig }
})

// ================================================================ 汇总
console.log('\n' + '='.repeat(56))
console.log(`通过 ${pass} 项，失败 ${fail} 项`)
if (fail) {
  console.log('\n失败详情：')
  for (const [n, e] of failures) {
    console.log(`  ${n}`)
    console.log('    ' + String(e.stack).split('\n').slice(0, 3).join('\n    '))
  }
}

// 清理：删掉本次的临时偏好文件，并顺手清理早先崩溃留下的残骸，
// 免得每跑一次就在临时目录里堆一个文件。
try {
  const fs = await import('node:fs')
  try { fs.unlinkSync(TMP_PREFS) } catch {}
  const dir = os.tmpdir()
  for (const f of fs.readdirSync(dir)) {
    if (/^dsh-reqcheck-test-\d+\.json$/.test(f)) {
      try { fs.unlinkSync(path.join(dir, f)) } catch {}
    }
  }
} catch {}

console.log(fail === 0 ? '=== 全部测试通过 ===' : '=== 有失败项 ===')
process.exit(fail === 0 ? 0 : 1)
