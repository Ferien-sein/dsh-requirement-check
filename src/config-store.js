/**
 * 偏好持久化
 *
 * 为什么自己写文件、不用 DSH 的 settings：
 *   上一轮我按类型契约写了 `settings.get()` 来读自己的配置，后来从 dshmarket
 *   的源码注释里发现 —— `SettingsService` 在 dsh 0.1.7 起改成 describe/update，
 *   没有 register；而且它本来也没有可靠的「读自身配置」方法。
 *   与其承诺一个读不回来的开关，不如自己存一个小文件。
 *
 * 位置：<用户目录>/.dsh/requirement-check.json
 * 内容：{ "locale": "zh-CN" | "zh-TW" | "en" }
 *
 * 可用环境变量 XBSH_PREFS_PATH 覆盖这个位置 —— 测试用它指向临时文件，
 * 免得污染用户真实的偏好（这一点很重要：早先测试就是往真实文件里写了
 * 一个 locale，导致后续测试被自己的残留状态干扰）。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const DIR = path.join(os.homedir(), '.dsh')
const DEFAULT_FILE = path.join(DIR, 'requirement-check.json')

export function prefsPath() {
  return process.env.XBSH_PREFS_PATH || DEFAULT_FILE
}

/** 读偏好；文件不存在或损坏都返回 {}，绝不抛 */
export function readPrefs() {
  try {
    const raw = fs.readFileSync(prefsPath(), 'utf8')
    const obj = JSON.parse(raw)
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}

/** 写偏好；失败返回 false（只读环境不要让插件崩） */
export function writePrefs(patch) {
  try {
    const file = prefsPath()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const next = { ...readPrefs(), ...patch }
    fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf8')
    return true
  } catch {
    return false
  }
}
