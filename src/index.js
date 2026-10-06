/**
 * dsh-requirement-check —— 需求体检（DSH 插件 · 宿主半体）
 *
 * 它做什么：拿你已经写好的需求描述，比对一张 14 项「盲区清单」，
 * 告诉你缺了什么、为什么重要、怎么补；另附 8 套行业模板可直接套用。
 * 三语：简体中文 / 繁體中文 / English。
 *
 * 为什么做这个形态（调研过插件市场 4412 个插件）：
 *   「把需求写得更结构化」已经很挤（dsh-prompt-enhance 系列、DSH-Project-Initialization…），
 *   而「检查你的描述有没有盲区」几乎没人做 —— 只有 dsh-ambiguity-handling（1★）。
 *   所以这里不做又一个「改写器」，只做体检 + 模板。
 *
 * 插件契约（照 DSH 的 ToolDefinition 类型写，不是猜的）：
 *   name / description / parameters(JSON Schema)
 *   output: { schema, render(args, value) -> ContentBlock[] }
 *   execute(args, exec) -> JSON 值
 *   —— description 与 parameters 用函数形式，按调用时解析语言，
 *      这样用户中途换语言也会立刻生效（字符串形式会在加载时锁死）。
 */
import z from '@deepseek-ai/schemastery'
import { checkRequirement, SPOT_IDS } from './blindspots.js'
import { TEMPLATES } from './templates.js'
import { templateIndex, renderTemplate, findTemplates } from './templates_render.js'
import { stringsFor } from './i18n.js'
import { resolveLocale, detectLocale, LOCALES, LOCALE_NAMES } from './locale.js'
import { readPrefs, writePrefs, prefsPath } from './config-store.js'
import {
  detectPlatform, platformToTarget, describeTarget,
  defaultTargetSentence, compatNote, TARGETS,
} from './platform.js'
import {
  searchRepos as ghSearch, judge as ghJudge, rankRepos as ghRank,
  formatReport as ghReport, toSearchQuery as ghQuery, cleanTerms as ghTerms,
} from './github-lookup.js'

export const name = 'requirement-check'
export const inject = []

/** 插件配置（宿主支持时由设置页渲染成表单；本插件不依赖能读回它） */
export const Config = z.object({
  /** 体检结果里最多列几条待补项 */
  maxItems: z.natural().min(1).max(SPOT_IDS.length).default(8),
  /** 默认语言；留空则按环境探测 */
  locale: z.union([z.const('zh-CN'), z.const('zh-TW'), z.const('en')]).default('zh-CN'),
  /** 是否把「先补盲区再动手」写进系统提示 */
  promptHint: z.boolean().default(true),
  /** 默认目标平台；auto = 跟随使用者自己的电脑 */
  target: z.string().default('auto'),
})

const TOOL_CHECK = 'requirement_check'
const TOOL_TEMPLATE = 'requirement_template'
const TOOL_DUP = 'requirement_duplicate_check'

/**
 * 当前语言：显式调用参数 > 环境变量 > 偏好文件 > 系统代码页 > 默认简中。
 * 判定逻辑统一在 locale.js 的 resolveLocale 里，这里只负责取偏好。
 * 每次调用都重算，不缓存 —— 用户可能中途切换。
 */
function currentLocale(explicit) {
  return resolveLocale(explicit, readPrefs().locale)
}

/**
 * 目标平台解析：显式参数 > 偏好文件 > auto（跟随使用者电脑）。
 * 返回 { target, info, resolvedBy } 供工具返回与报告使用。
 */
function resolveTarget(explicit) {
  const det = detectPlatform()
  const raw = explicit || readPrefs().target || 'auto'
  const valid = TARGETS.includes(raw) ? raw : 'auto'
  const useAuto = valid === 'auto'
  return {
    requested: valid,
    target: useAuto ? platformToTarget(det) : valid,
    resolvedBy: useAuto ? 'auto' : 'explicit',
    info: {
      os: det.os,
      osLabel: det.osLabel,
      arch: det.arch,
      bits: det.bits,
      certain: det.certain,
      detected: platformToTarget(det),
    },
  }
}

function textOutput(describe) {
  return {
    schema: { type: 'object', description: describe },
    render(_args, value) {
      const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      return [{ type: 'text', text }]
    },
  }
}

export function apply(ctx) {
  // ================= 工具 1：需求体检 =================
  ctx.tools.register({
    name: TOOL_CHECK,
    description: () => stringsFor(currentLocale()).toolCheckDesc,
    parameters: () => {
      const L = stringsFor(currentLocale())
      return {
        type: 'object',
        properties: {
          text: { type: 'string', description: L.paramText },
          max_items: { type: 'integer', description: L.paramMaxItems },
          // ★ 做什么类型：决定按哪套标准体检。
          //   不传 → 按全部通用盲点查（与以前完全一致，向后兼容）。
          //   传了 → 额外要求「该类型专属」的那几点：
          //     插件：挂在哪个软件里、要不要跟宿主交换信息（接口）
          //     脚本：怎么运行、需要什么运行环境
          //   还能让「怎么交付」这一项的措辞换成对应类型的说法
          //   （做程序是「exe 还是文件夹」，做插件是「装进宿主还是上架」）。
          kind: {
            type: 'string',
            description: L.paramKind,
            enum: ['program', 'plugin', 'script'],
          },
          locale: {
            type: 'string',
            description: L.localeNoteFmt
              .replace('{name}', LOCALE_NAMES[currentLocale()])
              .replace('{all}', LOCALES.join(' / ')),
            enum: LOCALES,
          },
          target: {
            type: 'string',
            description: L.paramTarget,
            enum: TARGETS,
          },
        },
        required: ['text'],
      }
    },
    output: () => textOutput(stringsFor(currentLocale()).outCheck),
    async execute(args) {
      const a = args || {}
      const locale = currentLocale(a.locale)
      const opts = { locale }
      const n = Number(a.max_items)
      if (Number.isFinite(n) && n > 0) opts.maxItems = Math.floor(n)
      // 类型由调用方给；不认识的值 checkRequirement 会忽略（按全部通用盲点查）
      if (typeof a.kind === 'string' && a.kind.trim()) opts.kind = a.kind.trim().toLowerCase()
      const r = checkRequirement(a.text, opts)
      const t = resolveTarget(a.target)
      return {
        locale: r.locale,
        kind: r.kind,
        score: r.score,
        level: r.level,
        ok: r.ok,
        covered: r.covered,
        total: r.total,
        missing: r.missing,
        platform: r.platform,
        target: t.target,
        targetLabel: describeTarget(t.target, locale),
        targetResolvedBy: t.resolvedBy,
        report: r.report,
      }
    },
  })

  // ================= 工具 2：行业模板 =================
  ctx.tools.register({
    name: TOOL_TEMPLATE,
    description: () => stringsFor(currentLocale()).toolTplDesc,
    parameters: () => {
      const L = stringsFor(currentLocale())
      return {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: L.paramKeyword },
          template_id: {
            type: 'string',
            description: L.paramTemplateId,
            enum: TEMPLATES.map((t) => t.id),
          },
          locale: { type: 'string', description: L.localeNoteFmt
            .replace('{name}', LOCALE_NAMES[currentLocale()])
            .replace('{all}', LOCALES.join(' / ')), enum: LOCALES },
        },
        required: [],
      }
    },
    output: () => textOutput(stringsFor(currentLocale()).outTpl),
    async execute(args) {
      const a = args || {}
      const locale = currentLocale(a.locale)
      const L = stringsFor(locale)

      if (a.template_id) {
        const tpl = TEMPLATES.find((t) => t.id === a.template_id)
        if (!tpl) {
          return {
            found: false,
            locale,
            draft: '',
            message: L.tplNotFoundFmt
              .replace('{id}', a.template_id)
              .replace('{ids}', TEMPLATES.map((t) => t.id).join(' / ')),
          }
        }
        const name = tpl.name[locale] || tpl.name['zh-CN']
        return {
          found: true,
          locale,
          id: tpl.id,
          name,
          draft: renderTemplate(tpl, locale),
          message: L.tplDraftHint,
        }
      }

      const list = findTemplates(a.keyword)
      const index = templateIndex(locale)
      return {
        found: list.length > 0,
        locale,
        count: list.length,
        templates: index.filter((t) => list.some((x) => x.id === t.id)),
        message: list.length ? L.tplListHint : L.tplNoneHint,
      }
    },
  })

  // ================= 工具 3：GitHub 查重（动手前先看有没有现成的）=================
  //
  // 为什么这个工具值得存在：很多需求 GitHub 上已经有成熟方案。
  // 先查一眼能省掉大量重复劳动，而且「拿现成的改」通常比从零做更可靠。
  //
  // ⚠️ 两个实测教训（写进代码里，避免以后改回去）：
  //   1. GitHub 的多词搜索是 **OR 语义**，会返回一堆无关的高星项目。
  //      实测搜 "excel merge tool" 头名是 3250 星的政治话题仓库 ——
  //      只看星数就会给出「建议用现成的」这种完全错误的结论。
  //      所以这里**强制先按相关性过滤**再判。
  //   2. 未登录时接口限流约 10 次/分钟，一定要把限流说清楚而不是报「失败」。
  ctx.tools.register({
    name: TOOL_DUP,
    description: () =>
      '在动手做之前，先查 GitHub 上有没有现成的软件或插件。' +
      '传入需求描述或关键词，工具会搜索并给出判断：建议用现成的 / 值得先看看 / ' +
      '自己做更省事，并列出星数、最近更新、许可证、是否已归档。' +
      '当用户说「有没有现成的」「别人做过吗」「先查查 GitHub」「别重复造轮子」时使用。' +
      '会自动把中文需求转成 GitHub 上更好搜的英文检索词。',
    parameters: () => ({
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '要查的东西：可以是自然语言需求（会自动转英文检索词），' +
            '也可以直接给英文关键词。中文整句在 GitHub 上命中率低，工具会处理。',
        },
        per_page: {
          type: 'integer',
          description: '取多少个结果（1~30，默认 8）。取多了会被相关性过滤掉一部分。',
        },
      },
      required: ['query'],
    }),
    output: () => textOutput('查重结果：判断、理由、按相关性排序的项目清单'),
    async execute(args) {
      const a = args || {}
      const raw = String(a.query || '').trim()
      if (!raw) {
        return { ok: false, query: '', error: '没有给要查的内容' }
      }

      // 中文 → 英文检索词（GitHub 上中文命中率很低）
      const conv = ghQuery(raw)
      const query = conv.query || raw
      const terms = conv.terms && conv.terms.length ? conv.terms : ghTerms(query)

      const perPage = Number(a.per_page)
      const { repos, error } = await ghSearch(query, {
        perPage: Number.isFinite(perPage) && perPage > 0 ? Math.floor(perPage) : 8,
      })
      if (error) {
        return {
          ok: false,
          query,
          original: raw,
          englishHits: conv.hits,
          error,
          // 限流/断网时给出可继续的路径，而不是一句「失败」了事
          hint: error.includes('频率')
            ? '可以改用你自己的联网搜索能力去搜同样的关键词，再按下面的格式评估。'
            : '可以改由你（agent）直接搜索 GitHub 或网上的同类方案。',
        }
      }

      const { kept, dropped } = ghRank(repos, terms)
      const verdict = ghJudge(kept, terms)
      return {
        ok: true,
        query,
        original: raw,
        englishHits: conv.hits,
        searched: repos.length,
        dropped,
        verdict: verdict.verdict,
        headline: verdict.headline,
        reasons: verdict.reasons,
        projects: (kept || []).slice(0, 8),
        report: ghReport(kept, verdict),
      }
    },
  })

  // ================= 工具 4：本机平台 / 目标系统 =================
  // 「默认选使用者电脑」的落点：让 agent 直接拿到本机的系统与位数，
  // 作为需求里的默认目标，而不用去猜。
  ctx.tools.register({
    name: 'requirement_platform',
    description: () => stringsFor(currentLocale()).toolPlatformDesc,
    parameters: () => {
      const L = stringsFor(currentLocale())
      return {
        type: 'object',
        properties: {
          set_default: {
            type: 'boolean',
            description: L.paramSetDefault,
          },
          target: {
            type: 'string',
            description: L.paramTarget,
            enum: TARGETS,
          },
          locale: {
            type: 'string',
            description: L.localeNoteFmt
              .replace('{name}', LOCALE_NAMES[currentLocale()])
              .replace('{all}', LOCALES.join(' / ')),
            enum: LOCALES,
          },
        },
        required: [],
      }
    },
    output: () => textOutput(stringsFor(currentLocale()).outPlatform),
    async execute(args) {
      const a = args || {}
      const locale = currentLocale(a.locale)
      const L = stringsFor(locale)
      const t = resolveTarget(a.target)
      const det = t.info
      const archNote = det.arch === 'arm64'
        ? ({ 'zh-CN': '（ARM64）', 'zh-TW': '（ARM64）', en: ' (ARM64)' }[locale] || ' (ARM64)')
        : ''

      let saved = null
      if (a.set_default === true && a.target) {
        saved = writePrefs({ target: a.target })
      }

      const current = L.platformCurrentFmt
        .replace('{osLabel}', det.osLabel)
        .replace('{bits}', String(det.bits))
        .replace('{archNote}', archNote)

      return {
        locale,
        platform: det,
        target: t.target,
        targetLabel: describeTarget(t.target, locale),
        targetResolvedBy: t.resolvedBy,
        defaultSentence: defaultTargetSentence(locale, detectPlatform()),
        compatNote: compatNote(locale, detectPlatform()),
        saved,
        prefsPath: prefsPath(),
        message: current + '\n' + L.platformTargetFmt.replace('{target}', describeTarget(t.target, locale))
          + '\n' + L.platformCertainty,
      }
    },
  })

  // ================= 工具 5：语言开关 =================
  // 用户说「用繁体」「switch to English」时调用。
  // 写进 ~/.dsh/requirement-check.json，之后两个工具默认就用这个语言。
  ctx.tools.register({
    name: 'requirement_locale',
    description: () => stringsFor(currentLocale()).toolLocaleDesc,
    parameters: () => ({
      type: 'object',
      properties: {
        locale: {
          type: 'string',
          description: stringsFor(currentLocale()).paramLocale,
          enum: LOCALES,
        },
      },
      required: ['locale'],
    }),
    output: () => textOutput(stringsFor(currentLocale()).outLocale),
    async execute(args) {
      const a = args || {}
      const target = resolveLocale(a.locale)
      const ok = writePrefs({ locale: target })
      const L = stringsFor(target)
      return {
        locale: target,
        saved: ok,
        prefsPath: prefsPath(),
        message: ok
          ? L.localeSwitchedFmt.replace('{name}', LOCALE_NAMES[target])
          : L.localeSaveFailed,
      }
    },
  })

  // ================= settings 注册 + 系统提示 =================
  if (typeof ctx.inject === 'function') {
    // settings：命名空间让管理页能渲染 Config 表单。
    // ⚠️ API 漂移：dsh 0.1.0-rc.7 时代是 settings.register(ns, schema, opts)；
    //   0.1.7 起改成 describe/update，没有 register —— 那时会抛 TypeError 并被
    //   cordis 吞掉。所以必须 typeof + try/catch，失败也不影响三个工具。
    ctx.inject(['settings'], (sctx) => {
      try {
        if (typeof sctx.settings?.register === 'function') {
          sctx.settings.register('dsh-requirement-check', Config, { applies: 'live' })
        }
      } catch {
        /* 宿主代际不支持第三方命名空间时静默跳过 */
      }
    })

    // 系统提示：让 agent 在动手前先按盲区追问，并跟随用户语言回答。
    // 语言在这里不能锁死，所以用函数形式（PromptSection.text 支持函数）。
    ctx.inject(['systemPrompt'], (sctx) => {
      try {
        sctx.systemPrompt.section({
          name: 'requirement-check-hint',
          order: 900,
          text: () => stringsFor(currentLocale()).promptHint,
        })
      } catch {
        /* 没有 systemPrompt 服务时跳过；工具仍然可用 */
      }
    })
  }
}
