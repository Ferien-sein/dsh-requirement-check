/**
 * 语言：简体中文 / 繁體中文 / English
 *
 * 为什么自己做，不用 DSH 的 locale 服务：
 *   那个服务挂在**客户端（UI）半体**上（见 dshmarket/client/client.js 的
 *   ctx.locale.register），本插件只有宿主半体，拿不到。
 *   而且真正需要翻译的是工具**返回的报告正文**，那本来就得自己管。
 *
 * 默认语言的判断顺序：
 *   1. 环境变量 XBSH_LOCALE / DSH_LOCALE / LANG
 *   2. Windows 系统代码页（936→简中，950→繁中）
 *   3. 兜底 zh-CN
 */

export const LOCALES = ['zh-CN', 'zh-TW', 'en']
export const DEFAULT_LOCALE = 'zh-CN'

/** 各语言的显示名（用于工具返回里的提示） */
export const LOCALE_NAMES = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English',
}

function fromEnv() {
  const raw =
    process.env.XBSH_LOCALE ||
    process.env.DSH_LOCALE ||
    process.env.LC_ALL ||
    process.env.LC_MESSAGES ||
    process.env.LANG ||
    ''
  return String(raw).toLowerCase()
}

/** 把各种写法归一化：zh-tw / zh_TW / zh-Hant / english / en-US … */
export function normalizeLocale(value) {
  if (!value) return null
  const v = String(value).toLowerCase().replace(/_/g, '-')
  if (v.startsWith('en')) return 'en'
  if (v.includes('hant') || v.includes('tw') || v.includes('hk') || v.includes('mo')) return 'zh-TW'
  if (v.startsWith('zh') || v.includes('hans') || v.includes('cn') || v.includes('sg')) return 'zh-CN'
  return null
}

/** 猜一个默认语言 */
export function detectLocale() {
  const fromVar = normalizeLocale(fromEnv())
  if (fromVar) return fromVar

  // Windows 控制台代码页：936 = 简体中文，950 = 繁体中文
  if (process.platform === 'win32') {
    const cp = Number(process.env.CP || process.env.OEMCP || 0)
    if (cp === 950) return 'zh-TW'
    if (cp === 936 || cp === 54936) return 'zh-CN'
  }
  return DEFAULT_LOCALE
}

/**
 * 解析最终使用的语言。优先级（唯一的判定入口，其他模块都调它）：
 *
 *   1. configured —— 显式配置或调用参数
 *   2. 环境变量    —— XBSH_LOCALE / DSH_LOCALE / LANG 等
 *   3. saved       —— 持久化下来的偏好（~/.dsh/requirement-check.json）
 *   4. 系统代码页
 *   5. DEFAULT_LOCALE
 *
 * 第 2 步排在第 3 步前面：环境变量是「本次运行的明确意图」，
 * 应该能压过一个持久化下来的旧选择。
 */
export function resolveLocale(configured, saved) {
  return (
    normalizeLocale(configured) ||
    normalizeLocale(fromEnv()) ||
    normalizeLocale(saved) ||
    detectLocale() ||
    DEFAULT_LOCALE
  )
}
