/**
 * 反证：故意删掉一个翻译键，确认新断言真的能抓到。
 * 用法: node tools/prove-fault-injection.mjs
 *
 * 目的：证明这条测试不是「永远通过」的摆设。
 */
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..')
const I18N = path.join(ROOT, 'src', 'i18n.js')
const RUN = path.join(ROOT, 'test', 'run.mjs')

const original = fs.readFileSync(I18N, 'utf8')
// 目标行：zh-CN 的 delivery 标题。
// 只匹配内容，不把行尾算进去（文件是 CRLF，写死 \n 会匹配不到）。
const VICTIM = "      delivery: '怎么交付、以后怎么打开（使用方式）',"

if (!original.includes(VICTIM)) {
  console.log('找不到要删的目标行，反证无法进行')
  process.exit(2)
}

let failed = false
try {
  fs.writeFileSync(I18N, original.replace(VICTIM, ''), 'utf8')
  console.log('已删除 zh-CN 的 delivery 标题，运行测试…')

  let out = ''
  try {
    out = execFileSync(process.execPath, [RUN], { cwd: ROOT, encoding: 'utf8' })
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '')
  }

  const caught = /漏翻/.test(out) && /delivery/.test(out)
  const failedCount = (out.match(/通过 (\d+) 项，失败 (\d+) 项/) || [])[1]
  console.log('测试输出里的失败计数：', failedCount)
  console.log(caught ? '✔ 断言成功抓到了漏翻（含「漏翻」与 delivery）' : '✘ 断言没抓到，测试是摆设')
  failed = !caught
} finally {
  fs.writeFileSync(I18N, original, 'utf8')
  console.log('已还原 i18n.js')
}

// 还原后再跑一次，确认是绿的
let clean = ''
try {
  clean = execFileSync(process.execPath, [RUN], { cwd: ROOT, encoding: 'utf8' })
} catch (e) {
  clean = (e.stdout || '') + (e.stderr || '')
}
const m = clean.match(/通过 (\d+) 项，失败 (\d+) 项/)
console.log('还原后：', m ? m[0] : '(取不到计数)')
if (m && m[2] !== '0') failed = true

process.exit(failed ? 1 : 0)
