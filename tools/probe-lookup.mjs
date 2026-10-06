/**
 * 插件查重工具的真实联网探针（手动跑，不进 CI）。
 *
 * mock 测试只能证明逻辑对；**接口是否真能用必须真连一次**。
 * 注意：GitHub 未登录时限流约 10 次/分钟，这个脚本只查 2 次。
 *
 * 跑法: node tools/probe-lookup.mjs
 */
import { searchRepos, judge, rankRepos, toSearchQuery, formatReport } from '../src/github-lookup.js'

const CASES = ['excel merge', 'shift schedule']
let fails = 0

for (const raw of CASES) {
  console.log('='.repeat(64))
  console.log('查询: %s', raw)
  console.log('='.repeat(64))
  const conv = toSearchQuery(raw)
  const query = conv.query || raw
  const terms = conv.terms && conv.terms.length ? conv.terms : query.split(/\s+/)
  console.log('  英文检索词: %s', query)

  const t0 = Date.now()
  const { repos, error } = await searchRepos(query, { perPage: 6 })
  const dt = Date.now() - t0

  if (error) {
    console.log('  ✘ %s', error)
    fails++
    continue
  }
  const { kept, dropped } = rankRepos(repos, terms)
  const verdict = judge(kept, terms)
  // 注意：Node 的 console.log 只支持 %s %d %i %f %o %j —— 没有 %.1f，
  // 写成 %.1f 会把它原样打出来（我第一次就踩了这个，输出里出现了 "%.1f 秒"）。
  console.log('  ✔ 返回 %d 个，过滤掉 %d 个无关的，用时 %s 秒',
    repos.length, dropped, (dt / 1000).toFixed(1))
  console.log('  判断: %s', verdict.headline)
  for (const r of verdict.reasons) console.log('     · %s', r)
  for (const p of kept.slice(0, 3)) {
    console.log('     - %s ⭐%d %s %s', p.full_name, p.stars, p.language || '-', p.updated)
  }
  console.log('')
  console.log(formatReport(kept, verdict).split('\n').slice(0, 8).join('\n'))
  console.log('')
}

console.log('='.repeat(64))
console.log('探针结果: %s', fails ? `${fails} 项失败` : '全部通过')
process.exit(fails ? 1 : 0)
