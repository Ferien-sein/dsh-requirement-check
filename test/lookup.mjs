/**
 * GitHub 查重的自检（用 mock fetch，不联网也能跑）。
 *
 * 用真实联网另有一个探针：tools/probe-lookup.mjs
 *
 * 跑法: node test/lookup.mjs
 */
import assert from 'node:assert/strict'

const gl = await import('../src/github-lookup.js')

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

function repo(name, desc, stars, extra = {}) {
  return {
    full_name: name, description: desc, stars,
    license: 'MIT', updated: '2026-08-01', archived: false, url: 'https://x', language: 'JS',
    ...extra,
  }
}

// ---------------------------------------------------------------- 查询词
console.log('\n【查询词】中文需求 → 可搜的英文词')

t('Excel 汇总类能映射到 excel/spreadsheet', () => {
  const r = gl.toSearchQuery('把每天三份销售 Excel 自动合并汇总的小工具')
  const q = r.query.toLowerCase()
  assert.ok(q.includes('excel') || q.includes('spreadsheet'), '实际: ' + r.query)
  assert.ok(r.hits.length > 0, '应报告命中的中文词')
})

t('记账/排班/工资/对账/文件 都能映射', () => {
  const cases = [
    ['帮我做个记账小工具记录每天花销', ['expense', 'finance']],
    ['排班表生成，统计每人班次', ['shift', 'schedul', 'roster']],
    ['算工资和加班费', ['payroll', 'overtime', 'attendance']],
    ['两个表对账找差异', ['reconcil', 'compare']],
    ['批量重命名整理文件', ['file', 'rename', 'organiz']],
  ]
  for (const [text, wants] of cases) {
    const q = gl.toSearchQuery(text).query.toLowerCase()
    assert.ok(wants.some((w) => q.includes(w)), `「${text}」→ ${q}`)
  }
})

t('查询词里没有重复单词（曾出现 excel merge spreadsheet merge）', () => {
  for (const text of ['Excel 合并汇总', '两个表对账', '批量整理文件', '排班表生成']) {
    const words = gl.toSearchQuery(text).query.split(/\s+/)
    const dup = [...new Set(words)].filter((w) => words.filter((x) => x === w).length > 1)
    assert.equal(dup.length, 0, `「${text}」有重复词: ${dup}`)
  }
})

t('没有映射时原样返回（不编造）', () => {
  const r = gl.toSearchQuery('一个很冷门的需求')
  assert.equal(r.query, '一个很冷门的需求')
  assert.equal(r.hits.length, 0)
})

t('中文不会被整句当成一个词', () => {
  const terms = gl.cleanTerms('一个把每天三份销售 Excel 自动合并汇总的小工具')
  for (const x of terms) assert.ok(x.length <= 40, '过长: ' + x)
  assert.ok(terms.some((x) => /Excel/i.test(x)), '应保留 Excel: ' + terms.join(','))
})

// ---------------------------------------------------------------- 相关性
console.log('\n【相关性】防止高星无关项目带偏')

const IRRELEVANT = repo('cirosantilli/china-dictatorship', 'some unrelated topic', 3250)
const RELEVANT = repo('skanmera/ExcelMerge', 'GUI tool to merge excel files', 847)

t('无关的高星项目被丢掉', () => {
  const { kept, dropped } = gl.rankRepos([IRRELEVANT, RELEVANT], ['excel', 'merge'])
  assert.equal(dropped, 1)
  assert.equal(kept.length, 1)
  assert.equal(kept[0].full_name, 'skanmera/ExcelMerge')
})

t('判重结论基于相关项目，不是无关高星项', () => {
  const v = gl.judge([IRRELEVANT, RELEVANT], ['excel', 'merge'])
  const joined = v.reasons.join(' ')
  assert.ok(joined.includes('已排除'), '应说明排除过无关项: ' + joined)
  assert.ok(!joined.includes('3250'), '不该用无关项目的星数做判断: ' + joined)
})

t('结果全不相关 → 判为没找到', () => {
  const v = gl.judge([IRRELEVANT], ['excel', 'merge'])
  assert.equal(v.verdict, 'none')
  assert.ok(v.headline.includes('自己做'))
})

t('不给关键词时不过滤（向后兼容）', () => {
  const { kept, dropped } = gl.rankRepos([IRRELEVANT, RELEVANT], [])
  assert.equal(dropped, 0)
  assert.equal(kept.length, 2)
})

t('同等相关时按星数排序', () => {
  const a = repo('x/small', 'excel merge', 10)
  const b = repo('y/big', 'excel merge', 999)
  const { kept } = gl.rankRepos([a, b], ['excel', 'merge'])
  assert.equal(kept[0].full_name, 'y/big')
})

// ---------------------------------------------------------------- 判重
console.log('\n【判重】客观信号 → 建议')

t('星高 + 在维护 + 有许可证 → 建议用现成', () => {
  const v = gl.judge([repo('a/x', 'excel merge tool', 800, { updated: '2026-08-01' })], ['excel', 'merge'])
  assert.equal(v.verdict, 'reuse', `实际 ${v.verdict}: ${v.reasons.join(' / ')}`)
})

t('已归档 → 警告且不直接建议复用', () => {
  const v = gl.judge([repo('a/x', 'excel merge', 5000, { archived: true })], ['excel', 'merge'])
  assert.ok(v.reasons.some((r) => r.includes('归档')), v.reasons.join(' / '))
  assert.notEqual(v.verdict, 'reuse')
})

t('长期未更新 → 警告', () => {
  const v = gl.judge([repo('a/x', 'excel merge', 900, { updated: '2019-01-01' })], ['excel', 'merge'])
  assert.ok(v.reasons.some((r) => r.includes('没更新')), v.reasons.join(' / '))
  assert.notEqual(v.verdict, 'reuse')
})

t('星数很低 → 不建议复用', () => {
  const v = gl.judge([repo('a/x', 'excel merge', 2)], ['excel', 'merge'])
  assert.ok(['build', 'compare'].includes(v.verdict), v.verdict)
})

t('许可证不明 → 提醒', () => {
  const v = gl.judge([repo('a/x', 'excel merge', 900, { license: '' })], ['excel', 'merge'])
  assert.ok(v.reasons.some((r) => r.includes('许可证')), v.reasons.join(' / '))
})

t('空列表不崩', () => {
  const v = gl.judge([], ['excel'])
  assert.equal(v.verdict, 'none')
})

t('字段缺失不崩（兼容原始 GitHub 格式）', () => {
  const raw = { full_name: 'a/b', description: 'excel merge', stargazers_count: 500,
    license: { spdx_id: 'MIT' }, pushed_at: '2026-08-01' }
  const v = gl.judge([raw], ['excel', 'merge'])
  assert.ok(v.verdict, '不该崩')
})

// ---------------------------------------------------------------- 报告
console.log('\n【报告】')

t('报告含判断、项目名、链接、星数、时间、许可证', () => {
  const repos = [repo('owner/repo', 'excel merge tool', 500)]
  const v = gl.judge(repos, ['excel', 'merge'])
  const text = gl.formatReport(repos, v)
  assert.ok(text.includes('判断'))
  assert.ok(text.includes('owner/repo'))
  assert.ok(text.includes('500'))
  assert.ok(text.includes('2026-08-01'))
  assert.ok(text.includes('MIT'))
})

t('空结果不崩', () => {
  assert.ok(gl.formatReport([]).includes('没有找到'))
})

// ---------------------------------------------------------------- 接口（mock fetch）
console.log('\n【接口】mock fetch')

await ta('正常返回时字段齐全', async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true, status: 200,
    json: async () => ({ items: [{
      full_name: 'a/b', html_url: 'https://github.com/a/b', description: 'x',
      stargazers_count: 42, language: 'Python', license: { spdx_id: 'MIT' },
      pushed_at: '2026-01-02T03:04:05Z', archived: false, open_issues_count: 1,
    }] }),
  })
  try {
    const { repos, error } = await gl.searchRepos('excel merge')
    assert.equal(error, null)
    assert.equal(repos.length, 1)
    assert.equal(repos[0].stars, 42)
    assert.equal(repos[0].license, 'MIT')
    assert.equal(repos[0].updated, '2026-01-02')
  } finally { globalThis.fetch = orig }
})

await ta('空查询词给出明确提示', async () => {
  const { repos, error } = await gl.searchRepos('')
  assert.deepEqual(repos, [])
  assert.ok(error && error.includes('空'))
})

await ta('403 → 提示频率限制', async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) })
  try {
    const { repos, error } = await gl.searchRepos('x')
    assert.deepEqual(repos, [])
    assert.ok(error.includes('频率'), error)
  } finally { globalThis.fetch = orig }
})

await ta('422 → 提示查询词不接受', async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => ({ ok: false, status: 422, json: async () => ({}) })
  try {
    const { error } = await gl.searchRepos('x')
    assert.ok(error.includes('不接受'), error)
  } finally { globalThis.fetch = orig }
})

await ta('网络异常 → 人话提示', async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('ENOTFOUND') }
  try {
    const { repos, error } = await gl.searchRepos('x')
    assert.deepEqual(repos, [])
    assert.ok(error.includes('连不上'), error)
  } finally { globalThis.fetch = orig }
})

await ta('items 为空不崩', async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ items: null }) })
  try {
    const { repos, error } = await gl.searchRepos('x')
    assert.deepEqual(repos, [])
    assert.equal(error, null)
  } finally { globalThis.fetch = orig }
})

console.log('\n' + '='.repeat(52))
console.log(`通过 ${pass} 项，失败 ${fail} 项`)
if (fail) {
  console.log('\n失败详情：')
  for (const [n, e] of failures) console.log(`  ${n}\n    ${String(e.stack).split('\n').slice(0, 3).join('\n    ')}`)
}
console.log(fail === 0 ? '=== 全部通过 ===' : '=== 有失败项 ===')
process.exit(fail === 0 ? 0 : 1)
