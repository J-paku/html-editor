// out/ の自己整合性検査(npm run buildの最後に走る)。本番はhttps://j-paku.github.io/html-editor/ のプロジェクトページなので、
// HTMLが参照するNextの束(css・js)がどれもbasePath(next.config.tsの正本)の下を指し、out/ に中身のあるファイルとして在るかを見る。
// basePathを落とした参照(/_next/…)は、根に配る手元では読めても本番ではj-paku.github.ioの別のリポジトリを指して壊れるため。
//   - 必須ページ(入口のindex.htmlと、GitHub Pagesが無い経路で返す404.html)の実在
//   - HTMLの中の /_next/ の参照がすべて <basePath>/_next/ で始まる
//   - <basePath>/_next/ のcss・jsの参照がout/ に実在し、空でない
// 参照が0件なら「全部揃っている」ではなく「検査できていない」なのでexit 1
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nextConfig from '../next.config.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'out')
const BASE_PATH = nextConfig.basePath ?? ''

if (BASE_PATH === '') {
  console.error(
    'verify-export: next.config.ts に basePath が無い。プロジェクトページ(/html-editor/)へ配れない'
  )
  process.exit(1)
}
if (!existsSync(OUT)) {
  console.error('verify-export: out/ が無い。先に next build を実行すること')
  process.exit(1)
}

let failed = false
const fail = message => {
  console.error(`verify-export: ${message}`)
  failed = true
}

const walk = dir =>
  readdirSync(dir).flatMap(name => {
    const p = path.join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

for (const rel of ['index.html', '404.html']) {
  if (!existsSync(path.join(OUT, rel))) fail(`必須ページが無い: ${rel}`)
}

const htmlFiles = walk(OUT).filter(file => file.endsWith('.html'))
// /_next/ の前がbasePathでない出現。属性の値・RSCの文字列(\"/_next/…)のどちらも、引用符の直後の /_next/ を拾う
const BARE_NEXT = /(?<=["'(])\/_next\//g
// basePathの下のcss・jsの参照
const ASSET_REF = new RegExp(`(?:href|src)="(${BASE_PATH}/_next/[^"]+\\.(?:css|js))"`, 'g')

let refs = 0
for (const file of htmlFiles) {
  const rel = path.relative(OUT, file)
  const html = readFileSync(file, 'utf-8')
  const bare = html.match(BARE_NEXT)?.length ?? 0
  if (bare > 0) fail(`${rel} に basePath(${BASE_PATH})の無い /_next/ の参照が ${bare} 件ある`)
  for (const [, ref] of html.matchAll(ASSET_REF)) {
    refs += 1
    const abs = path.join(OUT, decodeURIComponent(ref.slice(BASE_PATH.length)))
    if (!existsSync(abs)) {
      fail(`${rel} が参照する ${ref} が out/ に無い`)
      continue
    }
    // 存在だけを見ると0バイトの束が通る。中身が空なら「HTMLは出ているのに何も効かない画面」を配ることになる
    if (statSync(abs).size === 0) fail(`${rel} が参照する ${ref} が空(0 bytes)`)
  }
}
if (refs === 0) fail(`${BASE_PATH}/_next/ の css・js の参照が0件。検査が成立していない`)

if (failed) process.exit(1)
console.log(`verify-export: OK (${htmlFiles.length} html, ${BASE_PATH}/_next/ の参照 ${refs} 件)`)
