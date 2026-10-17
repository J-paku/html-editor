// 変異テスト100%(stryker.config.mjs の mutate)とファイル別カバレッジ100%(vitest.config.ts)の対象の正本。
// 一覧を手で並べると、新しいファイルを足し忘れたときに黙って門の外へ出る。そこで設定を読むたびに src をたどり、
// 純粋モジュールと src/lib/ の置き場にある .ts を下の規則で選ぶ。新しいファイルは、置いた時点で両方の門の対象になる
// (AGENTS.md の不変ルール4)。
//
// 規則:
//   含める: src/lib/**/*.ts・src/utils/**/*.ts・src/components/**/utils/**/*.ts(ロジックを置く場所)
//   外す:   *.test.ts(テスト)・*.d.ts(型の宣言)・*.fixture.ts(テストが読むデータ)・*.test-helper.ts(テストの部品)・
//           types.ts(型だけのファイル)・hooks/ の下(単体テストを置かない層で、動きは統合テストが見る)
//   名指し: 下の OUTSIDE_GATES はどちらの門にも入れない。COVERAGE_ONLY は変異テストから外し、ファイル別100%だけで固める
//           (どちらも今は空。足すときは外す理由を注釈に書く)
//
// 名指ししたパスが1つでも実在しないと、読み込む時点で落とす。移動・改名・打ち間違いで名指しが空振りすると、
// 外したつもりのファイルが門に入る(または外れる)のに気付けないため。
// 規則やたどり方が壊れて対象が黙って減ったときも、読み込む時点で落とす(下の「自己検査」)。
// 返すパスはリポジトリ直下からの '/' 区切りで、並べ替え済み。
//
// 使い方: import { MUTATION_TARGETS, COVERAGE_TARGETS } from './scripts/gate-targets.mjs'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// cwd に依存しない。どこから呼んでもリポジトリ直下を見る(Stryker の作業用の写しの中でも、写しの直下を見る)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(ROOT, 'src')
const SKIP_DIRS = new Set(['node_modules', '.git'])

// 純粋モジュールと lib の置き場(含める規則)
const IN_PURE_DIR = /^src\/(?:lib|utils)\/.+\.ts$|^src\/components\/(?:.+\/)?utils\/.+\.ts$/
// 置き場の中でも、ロジックのモジュールではない名前(外す規則)
const NOT_MODULE = /\.(?:test|d|fixture|test-helper)\.ts$|(?:^|\/)types\.ts$|(?:^|\/)hooks\//

// どちらの門にも入れないもの
const OUTSIDE_GATES = []

// 変異テストから外し、ファイル別100%だけで固めるもの
const COVERAGE_ONLY = []

// ---- 自己検査 ----
// 規則やたどり方が壊れて対象が黙って減っても、1件以上拾えている限りどの門も通ってしまう
// (例: 含める規則からコンポーネントの utils の項を消すと、そこへ置いたファイルが門の外へ出るのに、0件の検査では気付けない)。
// そこで読み込む時点で下の4つを確かめ、外れたら落とす。1 は実際の一覧づくりと同じ判定(isMutationTarget)を、
// 2・3 はできあがった一覧そのものを見る

// 1. 規則の各項に当たる架空のパスの判定(実在しなくてよい。規則そのものの書き換えを見る)
const RULE_CASES = [
  // 含める
  ['src/lib/a.ts', true],
  ['src/lib/x/a.ts', true],
  ['src/utils/a.ts', true],
  ['src/utils/x/a.ts', true],
  ['src/components/utils/a.ts', true],
  ['src/components/A/utils/a.ts', true],
  ['src/components/A/B/utils/x/a.ts', true],
  // 外す名前はフォルダ名・ファイル名の全体で見る(名前の一部に含むだけなら含める)
  ['src/lib/my-types.ts', true],
  ['src/lib/use-hooks/a.ts', true],
  // 置き場の外
  ['src/lib/a.tsx', false],
  ['src/components/A/a.ts', false],
  ['src/hooks/use-a.ts', false],
  ['src/app/a.ts', false],
  // 置き場の中でも外す名前
  ['src/lib/a.test.ts', false],
  ['src/lib/a.d.ts', false],
  ['src/lib/a.fixture.ts', false],
  ['src/lib/a.test-helper.ts', false],
  ['src/lib/types.ts', false],
  ['src/components/A/utils/types.ts', false],
  ['src/lib/hooks/use-a.ts', false],
  ['src/components/A/hooks/utils/a.ts', false],
]

// 2. 実在するファイルの判定(src のたどり方まで含めて見る)。名指しと同じく、実在しないと落とす。
// 置き場ごとに1つずつ足していく(今あるのは lib だけ)
const MUST_INCLUDE = ['src/lib/content/read.ts']
// 外れるべきもの(どちらの門にも入らない): テスト
const MUST_EXCLUDE = ['src/lib/content/read.test.ts']

// 3. 置き場ごとの変異テストの対象の件数の下限。目標ではなく、規則やたどり方が壊れて大きく減ったときに落とすための床。
// 置き場にファイルが増えたら、実測から下限を上げる
const FLOORS = [['src/lib/', 1]]

// 4. types.ts は型だけのファイルとして名前で外す。名前だけで外すと、そこへ関数や定数を書いても門の外に残るので、
// 置き場の中の types.ts に値の宣言(関数・定数・クラス・enum)が無いかを中身で確かめる。
// 判定の正規表現そのものも、下の DECLARATION_CASES で固定する
const RUNTIME_DECLARATION =
  /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:const|let|var|function|class|enum)\b/m
const DECLARATION_CASES = [
  ['export type A = { b: number }', false],
  [`import type { A } from './a'`, false],
  ['// const a = 1', false],
  ['export const a = 1', true],
  ['  let a = 1', true],
  ['export default function a() {}', true],
  ['export async function a() {}', true],
  ['class A {}', true],
  ['export enum A { B }', true],
]

// 名指しが空振りしていないか、読み込む時点で確かめる
const missing = [...OUTSIDE_GATES, ...COVERAGE_ONLY, ...MUST_INCLUDE, ...MUST_EXCLUDE].filter(
  file => !existsSync(path.join(ROOT, file))
)
if (missing.length > 0) {
  throw new Error(`scripts/gate-targets.mjs: 名指ししたパスが実在しない: ${missing.join(', ')}`)
}

// 壊れたシンボリックリンクで statSync が例外を投げないよう、実体の無い入口は集める前に落とす
const walk = dir =>
  readdirSync(dir).flatMap(name => {
    if (SKIP_DIRS.has(name)) return []
    const p = path.join(dir, name)
    const stat = statSync(p, { throwIfNoEntry: false })
    if (stat === undefined) return []
    return stat.isDirectory() ? walk(p) : [p]
  })

const toPosix = p => p.split(path.sep).join('/')

const named = new Set([...OUTSIDE_GATES, ...COVERAGE_ONLY])

// 変異テストの対象か(リポジトリ直下からの '/' 区切りのパスで判定する)
const isMutationTarget = file =>
  IN_PURE_DIR.test(file) && !NOT_MODULE.test(file) && !named.has(file)

// 自己検査の失敗。どの検査が何に外れたかを添えて落とす
const failSelfCheck = (what, items) => {
  if (items.length > 0) {
    throw new Error(`scripts/gate-targets.mjs: 自己検査に失敗(${what}): ${items.join(', ')}`)
  }
}

failSelfCheck(
  '規則の判定が期待と違うパス → 期待',
  RULE_CASES.filter(([file, expected]) => isMutationTarget(file) !== expected).map(
    ([file, expected]) => `${file} → ${expected}`
  )
)
failSelfCheck(
  '値の宣言の判定が期待と違う行 → 期待',
  DECLARATION_CASES.filter(([code, expected]) => RUNTIME_DECLARATION.test(code) !== expected).map(
    ([code, expected]) => `${code} → ${expected}`
  )
)

const SRC_FILES = walk(SRC_DIR).map(file => toPosix(path.relative(ROOT, file)))

export const MUTATION_TARGETS = SRC_FILES.filter(isMutationTarget).sort()

// 1件も拾えないときは、対象が無いのではなく見る場所を間違えている。門が空のまま通らないよう落とす
if (MUTATION_TARGETS.length === 0) {
  throw new Error(
    'scripts/gate-targets.mjs: 変異テストの対象が1件も無い。src の場所か規則を疑うこと'
  )
}

export const COVERAGE_TARGETS = [...MUTATION_TARGETS, ...COVERAGE_ONLY].sort()

failSelfCheck(
  '変異テストの対象に入っていない',
  MUST_INCLUDE.filter(file => !MUTATION_TARGETS.includes(file))
)
failSelfCheck(
  '門の対象から外れていない',
  MUST_EXCLUDE.filter(file => COVERAGE_TARGETS.includes(file))
)
failSelfCheck(
  '置き場の件数が下限を割った 置き場 件数 < 下限',
  FLOORS.flatMap(([dir, floor]) => {
    const count = MUTATION_TARGETS.filter(file => file.startsWith(dir)).length
    return count < floor ? [`${dir} ${count} < ${floor}`] : []
  })
)
failSelfCheck(
  'types.ts に値の宣言がある。型以外は別の名前のファイルへ移すこと',
  SRC_FILES.filter(
    file =>
      IN_PURE_DIR.test(file) &&
      path.posix.basename(file) === 'types.ts' &&
      RUNTIME_DECLARATION.test(readFileSync(path.join(ROOT, file), 'utf8'))
  )
)
