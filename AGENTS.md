# AGENTS.md

このリポジトリで作業するコードエージェント(Claude Code / Codex / Cursor / Gemini CLIなど)の入口。

AIが作ったHTMLをブラウザの中で直す静的な道具`html-editor`の作業場。配信先は`https://j-paku.github.io/html-editor/`(GitHub Pagesのプロジェクトページ)。
Next.js 16(App Router)の静的エクスポートで、サーバもデータベースも無い。何を作るかの正本は[docs/design.md](docs/design.md)(承認済みの設計文書から写し、今はこちらを更新し続ける。リポジトリの外にある原本はもう更新しない)。

**人はコードを読んでレビューしない。** 代わりに制約(テスト・検査)を極端に多く置き、すべて通ったものを信頼する。「完了」はレビューではなく、すべての門を通ったことで言う。
テストと画面の作りはJ-paku.github.io(ポートフォリオ)と同じ形にしてある。

## 不変ルール(破ったら即中断して報告)

1. **表示文字列を`content/`の外にハードコードしない。** コンポーネントに表示する言葉のリテラルを書かない。`content/`の実データを読んでよいのは`src/lib/content/`だけ(ESLint)
2. **フックを呼んでよいのは`container.tsx`と、`hooks`フォルダの中の`use-`始まりのファイルだけ。** フックを1つでも呼ぶコンポーネントはコンテナで、ファイル名は`container.tsx`(Reactの組み込みのフックも数える。`memo()`・`forwardRef()`はフックではない)。
   フックを呼ばない表示部品の入口は`index.tsx`。状態コンテナのフォルダには`index.tsx`を置かず、外からは`container`を直接指す。
   `hooks`フォルダは`container.tsx`のあるフォルダ(と`src/hooks/`)にだけ置き、`use-`始まりのフック以外を置かない。フックはフォルダ化しても`index.ts`を作らない。
   ESLintの`layer/hook-only-in-container`と`scripts/check-hook-rule.mjs`が守らせる
3. **外の世界(ファイル・IndexedDB・ネットワーク・Service Worker・contentの読み出しなど)に触れてよいのは、`src/lib/`と、I/Oコンテナ(一覧の正本は`scripts/container-dirs.mjs`。今は`src/components/EditorPage`だけ)の`container.tsx`とその隣の`hooks`フォルダ、画面のローダー(`index.tsx`)、`src/app/`だけ。**
   `src/lib/`の下は全部が外の世界の入口で、純粋関数は`src/utils/`に置く。表示部品と状態コンテナは、間にフック・部品・utilsを挟んでも入口へ届かない。`fetch`・`indexedDB`・`showDirectoryPicker`などimportの要らない入口も同じ。`scripts/check-layers.mjs`が守らせる
4. **新しいロジックは純粋関数(`src/utils/`・コンポーネント専用の`utils`)か`src/lib/`に置き、ファイルごとにカバレッジ100%・ミューテーション100%を守る。**
   `hooks`フォルダに単体テストを置かず、どのテストでも`renderHook`を使わない。コンポーネントを描くテストは、リポジトリ直下の`__tests__/<unit>/…/<動作>.integration.test.tsx`(コンテナごとに1本以上)だけに書く。
   `hooks`フォルダの中のファイルと全部の`container.tsx`は、統合テストのカバレッジでファイル別100%。`scripts/check-test-boundary.mjs`・`scripts/check-coverage-ignores.mjs`と2つのVitestの設定が守らせる
5. **色は`src/styles/tokens.css`だけで定義し、ほかのCSSは`var(--color-…)`で参照する。** スタイルはCSS Modules(1フォルダに`*.module.css` 1つまで、名前はフォルダ名のkebab-case)。Tailwindを使わない(入力のHTMLが使うTailwindを直す機能とは別の話)
6. **エージェントは自分でコミットしない。** 利用者が明示的に指示したときだけ実行する。コミットにAI署名(`Co-Authored-By`など)を入れない

制約は上げる方向にだけ動かす。床を下げる・テストを消す・変異テストやファイル別100%の対象から外す・テストの境界を変えるには利用者の決定が要る。

## 置き場

| 置き場                              | 置くもの                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/`                          | 経路の定義だけ。画面の本体は持たない                                                                                           |
| `src/components/EditorPage/`        | 画面は1つ。`index.tsx`はサーバのローダー(contentの読み出しだけ)、`container.tsx`が画面を組み立てる                             |
| `src/components/<Name>/`            | フォルダ名はPascalCase、中のファイル名はkebab-case。Propsの型は入口のファイルに書く                                            |
| `src/hooks/`                        | 2か所以上のコンテナが使うフック                                                                                                |
| `src/lib/`                          | 外の世界に触れる入口(ファイル・IndexedDB・contentの読み出し)                                                                   |
| `src/utils/`                        | 純粋関数・定数                                                                                                                 |
| `src/styles/tokens.css`             | 色の定義                                                                                                                       |
| `content/`                          | 表示文字列(型は`content/types/`)                                                                                               |
| `__tests__/`                        | 統合テスト(`*.integration.test.tsx`)・統合テストだけが使う部品(`*.test-helper.ts`)・単位フォルダの直下の`container.fixture.ts` |
| `tests/`                            | E2E(`*.spec.ts`)。ビルド結果(`out/`)でしか確かめられないものだけ                                                               |
| `src/**/*.test.ts`(対象の隣)        | 単体テスト(純粋関数と`src/lib/`)                                                                                               |
| `src/**/*.test-helper.ts`(対象の隣) | 単体テストだけが使う部品(`src/lib/`の単体テストが使う偽のフォルダ・偽の`indexedDB`など)                                        |

バレルを作らない(`from '.'`・`from '..'`はESLintが落とす)。

## テスト(4層)

| 層                        | 設定                           | 拾うもの                                        | 門                                                                                 |
| ------------------------- | ------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| 単体(Vitest・node)        | `vitest.config.ts`             | `src/**/*.test.ts`                              | 純粋モジュールと`src/lib/`のファイル別100%(対象の正本は`scripts/gate-targets.mjs`) |
| 統合(Vitest Browser Mode) | `vitest.integration.config.ts` | `__tests__/**/*.integration.test.tsx`(Chromium) | `container.tsx`と`hooks`フォルダのファイル別100%                                   |
| 変異(Stryker)             | `stryker.config.mjs`           | 単体と同じ対象                                  | 生き残りの変異体0(`break` 100)。既定は変わった変異体だけ(incremental)              |
| E2E(Playwright)           | `playwright.config.ts`         | `tests/**/*.spec.ts`                            | `out/`を`/html-editor/`の下で配って開く(既定`:4317`、`E2E_PORT`で変更)             |

- 統合テストのモックはネットワークと時間だけ(ファイルを選ぶ窓だけは自動テストが押せないので、ブラウザの中の保存場所(OPFS)のフォルダを返す形に差し替える)。断定は利用者に見えるもの(role・名前・文字)で行う
- `src/lib/`の単体テスト(node)は、ブラウザの入口(File System Accessのピッカー・`indexedDB`)を`vi.stubGlobal`で差し替え、ファイルとフォルダのハンドルは偽物(`src/**/*.test-helper.ts`)を渡して測る
- 時間帯はUTCに固定する(`TZ=UTC`と、統合テストのブラウザの`timezoneId`)
- **新しい検査は必ず一度落とす。** 修正を外す・期待値を反転するのどちらかでPASS → FAILが動くのを見てから採る

## 走らせるもの

| コマンド                   | 中身                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `npm run typecheck`        | 型                                                                                        |
| `npm run lint`             | ESLint(レイヤー境界・フックを呼んでよい所)                                                |
| `npm run format:check`     | Prettier                                                                                  |
| `npm run test:coverage`    | 単体とカバレッジの門                                                                      |
| `npm run test:boundary`    | テストの置き場・層の境界・カバレッジの除外の注釈・フックを呼ぶ所の4つの検査               |
| `npm run test:integration` | 統合テスト(門まで見るなら`-- --coverage`)                                                 |
| `npm run test:mutation`    | 変異テスト(全部を測り直すなら`-- --force`)                                                |
| `npm run build`            | 静的エクスポートと配信物の検査(`scripts/verify-export.mjs`。`/html-editor/_next/`の参照)  |
| `npm run test:e2e`         | E2E(先に`npm run build`)                                                                  |
| `npm run verify`           | lint → format:check → test:coverage → test:boundary → test:integration → buildを直列で1回 |

commitの直前に`npm run verify`を1回通す。純粋モジュールか`src/lib/`を変えたときは`npm run test:mutation`も足す。
CI(`.github/workflows/deploy.yml`)は`main`へのpushとPRで全部(統合のカバレッジ・変異・E2Eを含む)を走らせ、`main`へのpushのときだけGitHub Pagesへ配る。完了はローカルのPASSではなくCIが通ったことで言う。

## コミット

- 形式: `<type>: <日本語の要約>` + 本文は日本語の箇条書き。typeは`feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `ci` / `perf`
- **AI署名を入れない**(`Co-Authored-By`も書かない)
- **エージェントは自分でコミットしない**
