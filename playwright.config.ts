// out/ をGitHub Pagesと同じ経路(/html-editor/ の下)で静的配信して、ビルド結果でしか確かめられないものを検証する
import { defineConfig, devices } from '@playwright/test'
import nextConfig from './next.config'

// 同じ機械で2つのセッション・作業ツリーが同時にE2Eを回しても互いのビルドを検査しないよう、
// 既定のポートを他のリポジトリ(J-paku.github.ioの4173)と分け、E2E_PORTで変えられるようにする
const PORT = Number(process.env.E2E_PORT ?? 4317)
const ORIGIN = `http://localhost:${PORT}`
// 配信の入口(basePathの正本はnext.config.ts)
const ENTRY_URL = `${ORIGIN}${nextConfig.basePath ?? ''}/`

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  // 1ファイルの中のテストも別々のワーカーへ配る。テストは自分のcontextだけで開き、順番に依存しない
  fullyParallel: true,
  workers: process.env.CI ? undefined : 4,
  // CIではtest.onlyの混入を落とす
  forbidOnly: !!process.env.CI,
  // 再試行はしない(CIも手元も0)。再試行で通った失敗は緑として残り、揺れる検査を隠す。落ちたら原因を直す
  retries: 0,
  use: { baseURL: ORIGIN },
  webServer: {
    command: `node scripts/serve-out.mjs --port ${PORT}`,
    url: ENTRY_URL,
    // 既にポートを握っているサーバ(別の作業ツリー・別セッションのビルド)を使い回さない。
    // 使い回すと、こちらの変更を丸ごと戻しても他人のout/ を検査して全部緑になる。握られていれば起動の時点で落ちる
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
