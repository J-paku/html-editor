import { defineConfig, configDefaults } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'
import { COVERAGE_TARGETS } from './scripts/gate-targets.mjs'

// 1ファイルを文・分岐・関数・行のすべてで100%に固定するしきい値(glob ごとのしきい値では `100: true` と同じ意味)
const FULL_COVERAGE = { statements: 100, branches: 100, functions: 100, lines: 100 }

// 純粋モジュールと src/lib/ はファイルごとに100%で固定する。人がコードを読まない代わりに、テストが一度も通らない行・分岐を残さない。
// 対象は一覧を手で並べず、scripts/gate-targets.mjs の COVERAGE_TARGETS を使う。新しいファイルは置いた時点で対象になる。
// 一覧は src をたどって作るので実在しないパスは入らない。名指しで外したパスが実在しないときは、gate-targets.mjs を読み込む時点で落ちる

// 既定の環境は node(純粋関数と src/lib の入口)。コンポーネントを描くテストは単体には置かず、
// リポジトリ直下の __tests__ の統合テスト(vitest.integration.config.ts)だけに書く(AGENTS.md の不変ルール4)。
// 既定を替えないのは、単体テストを書かれたとおり DOM の無い node で走らせ続けるため
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    // 実行する機器のタイムゾーンに結果を左右させない
    // (package.json 側の TZ=UTC は npm 経由の入口、こちらは npx vitest を直接叩く入口を塞ぐ)
    env: { TZ: 'UTC' },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // __tests__ と *.integration.test.{ts,tsx} は統合テスト(vitest.integration.config.ts、実ブラウザ)の置き場と名前。
    // include の *.test.ts・*.test.tsx に当たってしまう名前なので外す
    exclude: [
      ...configDefaults.exclude,
      '**/.claude/**',
      'tests/**',
      '__tests__/**',
      '**/*.integration.test.{ts,tsx}',
    ],
    // 測るのは --coverage を付けたとき(npm run test:coverage、CI はこちら)だけ。npm run test は速く回す
    coverage: {
      provider: 'v8',
      enabled: false,
      include: ['src/**/*.{ts,tsx}'],
      // hooks/ 配下は単体テストを置かない層なので測らない。フックの動きは統合テスト(vitest.integration.config.ts)で見て、
      // そちらのカバレッジがフックを全部ファイル別100%で固める
      // (hooks/ にテストを置いていないかは scripts/check-test-boundary.mjs が検査する)
      // components/ の .tsx も同じ理由で測らない。コンポーネントを描くテストは __tests__ の統合テストにだけ置き、そちらで測る
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.fixture.ts',
        'src/**/*.test-helper.ts',
        'src/**/hooks/**',
        'src/components/**/*.tsx',
      ],
      reporter: ['text-summary'],
      reportsDirectory: 'coverage',
      // 2026-10-18の実測(statements 99.07%・branches 100%・functions 98.61%・lines 98.89%)から2pt引いて切り捨てた値。
      // 目標値ではなく、テストを消したり使われないコードを増やしたりして大きく落ちたときに止めるための床。ファイルが増えたら実測から取り直す
      thresholds: {
        statements: 97,
        branches: 98,
        functions: 96,
        lines: 96,
        // ファイル別100%(一覧は scripts/gate-targets.mjs の COVERAGE_TARGETS)
        ...Object.fromEntries(COVERAGE_TARGETS.map(file => [file, FULL_COVERAGE])),
      },
    },
  },
})
