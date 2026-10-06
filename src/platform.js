/**
 * 平台与架构探测
 *
 * 用途：需求里经常没写「要跑在什么系统、32 位还是 64 位」，
 * 而这直接决定能不能跑。这里探测**使用者自己的电脑**，
 * 作为默认值提出来，让用户确认或改掉即可。
 *
 * 纯逻辑，不依赖任何 DSH API。
 */
import { execFileSync } from 'node:child_process'

/** 操作系统标识 */
export const OS = {
  win: { id: 'win', zhCN: 'Windows', zhTW: 'Windows', en: 'Windows' },
  mac: { id: 'mac', zhCN: 'macOS', zhTW: 'macOS', en: 'macOS' },
  linux: { id: 'linux', zhCN: 'Linux', zhTW: 'Linux', en: 'Linux' },
}

/** 目标平台的可选值（工具参数用） */
export const TARGETS = [
  'auto',
  'windows-64', 'windows-32', 'windows-arm64',
  'macos-64', 'macos-arm64',
  'linux-64', 'linux-arm64',
  'web',
]

/** 每个目标的人话说明 */
export const TARGET_LABELS = {
  auto: { 'zh-CN': '跟随使用者电脑（默认）', 'zh-TW': '跟隨使用者電腦（預設）', en: "Follow the user's own machine (default)" },
  'windows-64': { 'zh-CN': 'Windows 64 位', 'zh-TW': 'Windows 64 位元', en: 'Windows 64-bit' },
  'windows-32': { 'zh-CN': 'Windows 32 位', 'zh-TW': 'Windows 32 位元', en: 'Windows 32-bit' },
  'windows-arm64': { 'zh-CN': 'Windows ARM64', 'zh-TW': 'Windows ARM64', en: 'Windows on ARM64' },
  'macos-64': { 'zh-CN': 'macOS Intel（x64）', 'zh-TW': 'macOS Intel（x64）', en: 'macOS on Intel (x64)' },
  'macos-arm64': { 'zh-CN': 'macOS Apple 芯片（M 系列）', 'zh-TW': 'macOS Apple 晶片（M 系列）', en: 'macOS on Apple silicon (M-series)' },
  'linux-64': { 'zh-CN': 'Linux 64 位（x64）', 'zh-TW': 'Linux 64 位元（x64）', en: 'Linux 64-bit (x64)' },
  'linux-arm64': { 'zh-CN': 'Linux ARM64', 'zh-TW': 'Linux ARM64', en: 'Linux on ARM64' },
  web: { 'zh-CN': '网页（浏览器打开）', 'zh-TW': '網頁（瀏覽器開啟）', en: 'Web page (opens in a browser)' },
}

/**
 * 探测本机平台。
 *
 * ⚠️ Node 的 process.arch 报的是**运行 Node 的那个进程**的架构。
 * 在 Apple 芯片上跑 x64 版 Node（Rosetta）会报 x64，所以 macOS 上
 * 额外查一次 sysctl 的 hw.optional.arm64 来纠正。
 * Windows 上的 ARM64 同理不可靠，这里不做过度推断，只按 process.arch 报，
 * 并把「不确定」如实标出来。
 */
export function detectPlatform() {
  const p = process.platform
  const arch = process.arch

  let os = 'linux'
  if (p === 'win32') os = 'win'
  else if (p === 'darwin') os = 'mac'

  let bits = arch === 'ia32' ? 32 : 64
  let archNorm = arch
  let certain = true

  if (os === 'mac') {
    // Rosetta 下 process.arch 可能是 x64，但机器其实是 arm64
    try {
      const out = execFileSync('/usr/sbin/sysctl', ['-n', 'hw.optional.arm64'], {
        encoding: 'utf8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'],
      })
      if (String(out).trim() === '1' && archNorm !== 'arm64') {
        archNorm = 'arm64'
        certain = false // 机器是 arm64，但当前 Node 跑在 Rosetta 下
      }
    } catch {
      certain = false
    }
  }

  if (os === 'win' && arch === 'x64') {
    // 64 位 Node 也可能装在 ARM64 Windows 上（x64 模拟）。
    // 这里不去查注册表，直接承认不确定。
    certain = false
  }

  return {
    os,
    osLabel: OS[os].en,
    arch: archNorm,
    bits,
    certain,
    nodePlatform: p,
    nodeArch: arch,
  }
}

/** 把探测结果转成 TARGETS 里的取值 */
export function platformToTarget(det) {
  if (!det) return 'auto'
  if (det.os === 'win') {
    if (det.arch === 'arm64') return 'windows-arm64'
    return det.bits === 32 ? 'windows-32' : 'windows-64'
  }
  if (det.os === 'mac') return det.arch === 'arm64' ? 'macos-arm64' : 'macos-64'
  if (det.os === 'linux') return det.arch === 'arm64' ? 'linux-arm64' : 'linux-64'
  return 'auto'
}

/** 目标值 → 人话（按语言） */
export function describeTarget(target, locale = 'zh-CN') {
  const t = TARGET_LABELS[target]
  if (!t) return String(target)
  return t[locale] || t['zh-CN']
}

/**
 * 给需求体检用的默认值描述。
 * 返回一句话，例如：
 *   「你的电脑是 Windows 64 位 —— 不特别说明时，就按这个来」
 */
export function defaultTargetSentence(locale, det) {
  const d = det || detectPlatform()
  const target = platformToTarget(d)
  const label = describeTarget(target, locale)
  const bitsWord = {
    'zh-CN': (b) => (b === 32 ? '32 位' : '64 位'),
    'zh-TW': (b) => (b === 32 ? '32 位元' : '64 位元'),
    en: (b) => (b === 32 ? '32-bit' : '64-bit'),
  }[locale] || ((b) => `${b}-bit`)

  const archNote =
    d.arch === 'arm64'
      ? { 'zh-CN': '（ARM64）', 'zh-TW': '（ARM64）', en: ' (ARM64)' }[locale] || ' (ARM64)'
      : ''

  if (locale === 'en') {
    return `Your machine is ${d.osLabel} ${bitsWord(d.bits)}${archNote} — unless stated otherwise, build for this (${label}).`
  }
  if (locale === 'zh-TW') {
    if (d.os === 'mac') {
      return `你的電腦是 macOS ${bitsWord(d.bits)}${archNote} —— 沒有特別說明時，就照這個來（${label}）。`
    }
    return `你的電腦是 ${d.osLabel} ${bitsWord(d.bits)}${archNote} —— 沒有特別說明時，就照這個來（${label}）。`
  }
  if (d.os === 'mac') {
    return `你的电脑是 macOS ${bitsWord(d.bits)}${archNote} —— 没有特别说明时，就按这个来（${label}）。`
  }
  return `你的电脑是 ${d.osLabel} ${bitsWord(d.bits)}${archNote} —— 没有特别说明时，就按这个来（${label}）。`
}

/** 本机是否 32 位 —— 用来提示「32 位程序能跑在 64 位系统上，反之不行」 */
export function compatNote(locale, det) {
  const d = det || detectPlatform()
  if (locale === 'en') {
    return 'Note: a 32-bit build runs on both 32- and 64-bit systems, but a 64-bit build will NOT run on 32-bit systems.'
  }
  if (locale === 'zh-TW') {
    return '提醒：32 位元的程式在 32／64 位元系統上都能跑，但 64 位元的程式在 32 位元系統上跑不起來。'
  }
  return '提醒：32 位程序在 32/64 位系统上都能跑，但 64 位程序在 32 位系统上跑不起来。'
}
