/**
 * 行业模板库（三语）—— 渲染与查询
 *
 * 数据部分由 tools/gen_templates.py 生成（三语 × 8 套 × 8 字段 = 192 条文案，
 * 手写容易漏字段，所以用脚本一次写全）。
 *
 * 每份模板 = 一组预填好的格子。用户挑一个，把示例替换成自己的内容即可。
 */

import { TEMPLATES, FIELD_LABELS } from './templates.js'

/** 字段顺序固定，按「先说做什么 → 现在怎么做 → 输入 → 输出 → 验收 → 异常 → 边界 → 使用者」排 */
export const FIELD_ORDER = [
  'goal', 'pain', 'input', 'output', 'done', 'error', 'scopeOut', 'operator',
]

/** 模板目录：只放索引信息，用于列表展示（三语） */
export function templateIndex(locale) {
  return TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name[locale] || t.name['zh-CN'],
    scene: t.scene[locale] || t.scene['zh-CN'],
  }))
}

/** 取某个语言下的字段值 */
export function templateFields(tpl, locale) {
  const out = []
  for (const key of FIELD_ORDER) {
    const cell = tpl.fields[key]
    if (!cell) continue
    out.push([key, cell[locale] || cell['zh-CN']])
  }
  return out
}

/**
 * 把模板渲染成可以直接编辑的需求草案。
 * @param {object} tpl 模板对象（TEMPLATES 里的一项）
 * @param {string} locale 语言
 */
export function renderTemplate(tpl, locale = 'zh-CN') {
  if (!tpl) return ''
  const name = tpl.name[locale] || tpl.name['zh-CN']
  const scene = tpl.scene[locale] || tpl.scene['zh-CN']
  const labels = FIELD_LABELS

  const head =
    locale === 'en'
      ? `What I want to build: ${name}\n(scenario: ${scene})`
      : `我想做的事：${name}\n（场景：${scene}）`

  const lines = [head, '']
  for (const [key, value] of templateFields(tpl, locale)) {
    const label = (labels[key] && (labels[key][locale] || labels[key]['zh-CN'])) || key
    lines.push(locale === 'en' ? `[${label}]` : `【${label}】`)
    lines.push(value)
    lines.push('')
  }

  lines.push(
    locale === 'en'
      ? '-- The above is a template example. Replace it with your own situation.'
      : locale === 'zh-TW'
        ? '—— 以上是範本範例，請把內容換成你自己的實際情況。'
        : '—— 以上是模板示例，请把内容改成你自己的实际情况。'
  )
  return lines.join('\n')
}

/** 按关键词找模板；不传就返回全部。匹配三语。 */
export function findTemplates(keyword) {
  if (!keyword) return TEMPLATES
  const k = String(keyword).toLowerCase()
  return TEMPLATES.filter((t) => {
    if (t.id.includes(k)) return true
    for (const key of ['name', 'scene']) {
      for (const v of Object.values(t[key])) {
        if (String(v).toLowerCase().includes(k)) return true
      }
    }
    for (const cell of Object.values(t.fields)) {
      for (const v of Object.values(cell)) {
        if (String(v).toLowerCase().includes(k)) return true
      }
    }
    return false
  })
}
