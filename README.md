# html-editor

生成AIが作ったHTMLを、ブラウザの中で直すための静的な道具。

- 配信先: https://j-paku.github.io/html-editor/
- 設計: [docs/design.md](docs/design.md)
- 作業の決まり: [AGENTS.md](AGENTS.md)

今は土台(設定・検査・テストの枠)だけで、編集器の機能はまだ無い。

## 使い方

Node.js 22で動かす。

```sh
npm ci
npm run dev       # 開発サーバ(http://localhost:3000/html-editor/)
npm run build     # out/ へ静的エクスポート
npm run start     # out/ を http://localhost:4317/html-editor/ で配る
npm run verify    # commit の前の検査一式
```

## 技術

Next.js 16(App Router・静的エクスポート)・React 19・TypeScript・CSS Modules。
テストはVitest(単体・Browser Modeの統合)・Stryker(変異)・Playwright(E2E)。
