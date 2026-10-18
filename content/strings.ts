// 画面に出す文字列の集まり(AGENTS.mdの不変ルール1: 表示文字列はcontent/ の外に書かない)。
// 表示部品ごとにまとめ、各部品には必要なまとまりだけを渡す。
// 読んでよいのはsrc/lib/content/ だけ(eslint.config.mjs)
import type { Strings } from './types/strings'

export const strings: Strings = {
  lang: 'ja',
  title: 'html-editor',
  startScreen: {
    productName: 'html-editor',
    description: 'HTMLを開いて、直して、そのまま見せる。',
    openFolder: 'フォルダを開く',
    openFile: 'ファイルを1つ開く',
    localNote: '編集した内容は、元のファイルに保存できます。',
    unsupportedTitle: 'ChromeかEdgeで開いてください',
    unsupportedDescription:
      'このブラウザは、フォルダを開いて元のファイルに保存する機能に対応していません。パソコンのChromeかEdgeをご利用ください。',
  },
}
