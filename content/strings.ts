// 画面に出す文字列の集まり(AGENTS.mdの不変ルール1: 表示文字列はcontent/ の外に書かない)。
// 表示部品ごとにまとめ、各部品には必要なまとまりだけを渡す。
// 読んでよいのはsrc/lib/content/ だけ(eslint.config.mjs)
import type { Strings } from './types/strings'

export const strings: Strings = {
  lang: 'ja',
  title: 'html-editor',
  editorLayout: {
    files: 'ファイル一覧',
    code: 'コード',
    preview: 'プレビュー',
  },
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
  toolbar: {
    label: '編集の操作',
    open: '開く',
    save: '保存',
    undo: '元に戻す',
    redo: 'やり直す',
    present: '全画面で表示',
    unsaved: '未保存の変更あり',
    modeLabel: 'プレビューのモード',
    editMode: '編集',
    interactMode: '操作',
    modeUnavailable: 'モード切り替えは今後対応します',
  },
  fileList: {
    title: 'ファイル',
    empty: 'ファイルがありません',
    unsaved: '未保存',
    notEditable: '編集できないファイル',
  },
  editor: {
    codeLabel: 'コードの編集欄',
    previewTitle: 'HTMLのプレビュー',
    noPreview: 'プレビューできるHTMLファイルがありません。',
  },
  notice: {
    dismiss: '閉じる',
    messages: {
      openFailed: '開けませんでした。もう一度お試しください。',
      noTextFile:
        '編集できるファイルがありません。HTMLやCSSのファイルを含むフォルダを開いてください。',
      readFailed: 'ディスクの内容を読み込めませんでした。',
      writeFailed: '保存できませんでした。',
      permissionDenied:
        'ファイルに書き込む許可が得られませんでした。保存するには許可してください。',
      draftFailed: '編集内容を一時保管できませんでした。',
      closeBlocked:
        '保存していない変更を一時保管できなかったので、閉じずにそのままにしました。保存してから、もう一度「開く」を押してください。',
      presentFailed: '全画面で表示できませんでした。',
    },
  },
}
