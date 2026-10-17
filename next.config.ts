import type { NextConfig } from 'next'

// GitHub Pagesのプロジェクトページ(https://j-paku.github.io/html-editor/)へ静的配信する。
// リクエスト時に動くサーバは無いのでexport固定。配信先はリポジトリ名の下なのでbasePathを付ける。
// trailingSlash: trueで経路がout/<経路>/index.htmlの実ファイルになる(GitHub Pagesがそのまま配れる形)。
// basePathの正本はここで、E2Eの配信(scripts/serve-out.mjs)・配信物の検査(scripts/verify-export.mjs)・
// playwright.config.ts・vitest.integration.config.tsはここを読む
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/html-editor',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
}

export default nextConfig
