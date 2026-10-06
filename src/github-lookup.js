/**
 * GitHub 查重（插件版）
 *
 * 与 Windows 应用里的 src/github_lookup.py 是同一套思路，纯逻辑、可单独测：
 *   搜索 → 按相关性过滤 → 给出「用现成 / 先看看 / 自己做」的判断
 *
 * 为什么插件版比应用版更有用：agent 自己就能联网搜，
 * 不受那 10 次/小时（未认证）的限制，而且能结合需求做更细的判断。
 *
 * 关键教训（应用版实测踩到的）：
 *   1. GitHub 的多词搜索是 **OR 语义**，会返回一堆无关的高星项目。
 *      实测搜 "excel merge tool" 的头名是个 3250 星的政治话题仓库 ——
 *      只看星数会给出完全错误的「建议用现成的」。所以必须按相关性过滤。
 *   2. 中文关键词在 GitHub 上命中率很低（整句中文返回 0 个），
 *      所以要把中文需求映射成英文检索词。
 */

export const GITHUB_SEARCH = 'https://api.github.com/search/repositories'

// 判定门槛（经验值，不是硬标准）
export const GOOD_STARS = 200
export const OK_STARS = 30
export const RECENT_DAYS = 540

/** 中文 → 英文检索词映射（GitHub 上中文命中率低） */
const EN_HINTS = [
  [['excel', '表格', '报表', '汇总', '合并'], ['excel merge', 'spreadsheet merge']],
  [['对账', '核对', '比对', '差异'], ['reconcile', 'reconciliation', 'compare spreadsheet']],
  [['记账', '花销', '开销', '支出', '账本'], ['expense tracker', 'personal finance']],
  [['库存', '出入库', '进销存'], ['inventory management', 'stock control']],
  [['排班', '值班', '轮班'], ['shift scheduler', 'roster', 'scheduling']],
  [['工资', '薪资', '加班', '考勤'], ['payroll', 'attendance', 'overtime']],
  [['报价', '成本', '预算', '装修'], ['cost estimator', 'quotation', 'budget']],
  [['文件', '批量改名', '整理', '归档'], ['file organizer', 'batch rename']],
  [['pdf', 'word', '文档', '转换', '生成文档'], ['pdf convert', 'docx generate', 'document automation']],
  [['提醒', '定时', '待办', '任务'], ['reminder', 'todo', 'scheduler']],
  [['客户', 'crm', '联系人'], ['crm', 'contact management']],
  [['图表', '统计', '可视化'], ['chart', 'visualization', 'report']],
  [['爬虫', '抓取', '采集'], ['scraper', 'crawler']],
  [['聊天', '机器人', 'bot'], ['chatbot', 'bot']],
  [['插件', 'plugin'], ['plugin', 'extension']],
]

/** 把这些词从需求里剥掉：它们只是连接/语气，没有检索价值 */
const STOP_WORDS = [
  '帮我', '我想', '我要', '想要', '我需要', '可以做', '能不能', '有没有',
  '一个', '一份', '一张', '一套', '把', '的', '和', '与', '跟',
  '用来', '用了', '然后', '就是', '这个', '那个', '什么', '怎么', '可以',
  '简单', '方便', '自动', '小工具', '软件', '程序', '工具', '东西',
]

/**
 * 把人话需求转成**适合在 GitHub 上搜的英文查询串**。
 *
 * 中文没有空格，不能简单按空格切分 —— 那样会把整句当成一个词，
 * 拿去搜什么也搜不到（实测）。
 *
 * @returns {{query: string, hits: string[], terms: string[]}}
 */
export function toSearchQuery(text) {
  const low = String(text || '').toLowerCase()
  const hits = []
  const enTerms = []
  for (const [needles, equivalents] of EN_HINTS) {
    const matched = needles.filter((n) => low.includes(n))
    if (matched.length) {
      hits.push(...matched)
      enTerms.push(...equivalents)
    }
  }
  if (!enTerms.length) {
    return { query: String(text || '').trim(), hits: [], terms: cleanTerms(text) }
  }
  // 按「词」去重，否则会出现 "excel merge spreadsheet merge" 这种重复
  const seen = new Set()
  const picked = []
  for (const term of enTerms) {
    const parts = term.split(' ').filter((w) => w && !seen.has(w))
    if (!parts.length) continue
    parts.forEach((w) => seen.add(w))
    picked.push(parts.join(' '))
    if (picked.length >= 3) break
  }
  const query = picked.join(' ')
  return { query, hits, terms: query.split(' ').filter((w) => w.length >= 2) }
}

/** 把一段中文描述切成关键词（英文/数字原样保留） */
export function cleanTerms(text) {
  let s = String(text || '')
  for (const ch of '，。、；：！？（）【】「」《》,.;:!?()[]<>"\'`~!@#$%^&*+=|\\/—…\n\t') {
    s = s.split(ch).join(' ')
  }
  for (const w of STOP_WORDS) s = s.split(w).join(' ')
  const out = []
  const seen = new Set()
  for (let w of s.split(/\s+/)) {
    w = w.replace(/^[-—_·]+|[-—_·]+$/g, '')
    if (w.length < 2) continue
    if (w.length > 8 && /^[\u4e00-\u9fff]+$/.test(w)) {
      for (let i = 0; i < w.length; i += 6) {
        const piece = w.slice(i, i + 6)
        if (piece.length >= 2 && !seen.has(piece)) { seen.add(piece); out.push(piece) }
      }
      continue
    }
    if (!seen.has(w)) { seen.add(w); out.push(w) }
  }
  return out
}

/** 一个仓库跟关键词的相关度（0~1）。用途：排掉高星的无关项目。 */
export function relevanceScore(repo, terms) {
  if (!terms || !terms.length) return 0
  const used = terms.map((t) => String(t).trim().toLowerCase()).filter((t) => t.length >= 2)
  if (!used.length) return 0
  const hay = `${repo.full_name || ''} ${repo.description || ''}`.toLowerCase()
  const hits = used.filter((t) => hay.includes(t)).length
  return hits / used.length
}

/**
 * 按「相关性优先、其次星数」排序，丢掉完全不相关的。
 * @returns {{kept: object[], dropped: number}}
 */
export function rankRepos(repos, terms, minScore = 0.34) {
  if (!terms || !terms.length) return { kept: [...(repos || [])], dropped: 0 }
  const kept = []
  let dropped = 0
  for (const r of repos || []) {
    if (relevanceScore(r, terms) < minScore) { dropped++; continue }
    kept.push(r)
  }
  kept.sort((a, b) => {
    const d = relevanceScore(b, terms) - relevanceScore(a, terms)
    if (Math.abs(d) > 1e-9) return d
    return (b.stars || 0) - (a.stars || 0)
  })
  return { kept, dropped }
}

/**
 * 判断：用现成的 / 先看看 / 自己做。
 * 只看客观信号（相关性、星数、是否归档、是否还在更新、许可证），不猜质量。
 */
export function judge(repos, terms) {
  let dropped = 0
  let list = repos || []
  if (terms && terms.length) {
    const r = rankRepos(list, terms)
    list = r.kept
    dropped = r.dropped
  }
  const reasons = []
  if (dropped) {
    reasons.push(`（有 ${dropped} 个搜索结果与需求明显无关，已排除 —— ` +
      'GitHub 按星数排时经常把无关的高星项目排在最前）')
  }
  if (!list.length) {
    return { verdict: 'none', dropped,
      headline: '没找到现成的，可以自己做',
      reasons: reasons.concat(['GitHub 上没有搜到明显相关的项目。']) }
  }
  const top = list[0]
  const stars = Number(top.stars || top.stargazers_count || 0)
  const updated = String(top.updated || top.pushed_at || top.updated_at || '')
  const archived = Boolean(top.archived)
  let lic = top.license
  if (lic && typeof lic === 'object') lic = lic.spdx_id || ''
  lic = String(lic || '').trim()
  const days = daysSince(updated.slice(0, 10))

  let strong = 0
  if (stars >= GOOD_STARS) {
    strong++
    reasons.push(`最相关的项目有 ${stars} 颗星，说明用的人不少`)
  } else if (stars >= OK_STARS) {
    reasons.push(`最相关的项目有 ${stars} 颗星，有一定使用量`)
  } else {
    reasons.push(`星数都不高（最高 ${stars}），可能没有成熟方案`)
  }
  if (archived) {
    reasons.push('⚠️ 但该项目已归档，作者不再维护')
    strong--
  } else if (days !== null && days > RECENT_DAYS) {
    reasons.push(`⚠️ 而且已 ${Math.floor(days / 30)} 个月没更新，要留意是否还适用`)
    strong--
  } else if (days !== null) {
    reasons.push(`最近还有更新（${updated.slice(0, 10)}），看来仍在维护`)
    strong++
  }
  if (!lic || lic === 'NOASSERTION' || lic === 'NONE') {
    reasons.push('❓ 没写清楚开源许可证，商用前要确认')
  } else {
    reasons.push(`许可证是 ${lic}`)
  }

  let verdict, headline
  if (strong >= 2) { verdict = 'reuse'; headline = '建议先用现成的，别从零做' }
  else if (strong >= 1) { verdict = 'compare'; headline = '有可参考的项目，值得先看一眼再决定' }
  else { verdict = 'build'; headline = '现成的都不太合适，自己做更省事' }

  return { verdict, headline, reasons, dropped, top }
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) return null
  const then = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Math.floor((Date.now() - then) / 86400000)
}

/**
 * 调 GitHub 搜索接口。
 * @returns {Promise<{repos: object[], error: string|null}>}
 */
export async function searchRepos(query, { perPage = 8, timeoutMs = 15000 } = {}) {
  const q = String(query || '').trim()
  if (!q) return { repos: [], error: '查询词是空的' }

  const url = new URL(GITHUB_SEARCH)
  url.searchParams.set('q', q)
  url.searchParams.set('sort', 'stars')
  url.searchParams.set('order', 'desc')
  url.searchParams.set('per_page', String(Math.max(1, Math.min(30, perPage))))

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  let data
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'dsh-requirement-check' },
      signal: ac.signal,
    })
    if (!res.ok) {
      if (res.status === 403) {
        return { repos: [], error: 'GitHub 限制了查询频率（未登录时约 10 次/分钟），请过一会儿再试' }
      }
      if (res.status === 422) {
        return { repos: [], error: '查询词 GitHub 不接受，换个更简单的说法再试' }
      }
      return { repos: [], error: `GitHub 返回错误 ${res.status}` }
    }
    data = await res.json()
  } catch (e) {
    const msg = e && e.name === 'AbortError' ? '查询超时' : `连不上 GitHub（${e && e.message}）`
    return { repos: [], error: msg }
  } finally {
    clearTimeout(timer)
  }

  const items = (data && data.items) || []
  const repos = items.map((it) => ({
    full_name: it.full_name || '',
    url: it.html_url || '',
    description: (it.description || '').trim(),
    stars: Number(it.stargazers_count || 0),
    language: it.language || '',
    license: ((it.license || {}).spdx_id) || '',
    updated: String(it.pushed_at || it.updated_at || '').slice(0, 10),
    archived: Boolean(it.archived),
    issues: Number(it.open_issues_count || 0),
  }))
  return { repos, error: null }
}

/** 把结果渲染成给用户看的文本 */
export function formatReport(repos, verdict) {
  if (!repos || !repos.length) return '没有找到相关项目。'
  const lines = []
  if (verdict) {
    lines.push('【判断】' + verdict.headline)
    for (const r of verdict.reasons || []) lines.push('  · ' + r)
    lines.push('')
  }
  lines.push(`找到 ${repos.length} 个相关项目（按相关性、其次星数排序）：`)
  repos.forEach((r, i) => {
    const flags = []
    if (r.archived) flags.push('已归档')
    if (!r.license || r.license === 'NOASSERTION' || r.license === 'NONE') flags.push('许可证不明')
    lines.push('')
    lines.push(`${i + 1}. ${r.full_name}  ⭐${r.stars}  ${r.language || ''}` +
      (flags.length ? `（${flags.join('、')}）` : ''))
    lines.push('   ' + r.url)
    if (r.description) lines.push('   ' + r.description.slice(0, 200))
    lines.push(`   最近更新：${r.updated || '未知'}   许可证：${r.license || '未标注'}`)
  })
  return lines.join('\n')
}
