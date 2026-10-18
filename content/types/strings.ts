// 画面に出す文字列の集まりの型。中身はcontent/strings.ts
export type Strings = {
  // <html lang> に入れる画面の言語
  lang: string
  // 画面の見出しと、文書の題名(<title>)
  title: string
  editorLayout: EditorLayoutStrings
  startScreen: StartScreenStrings
  toolbar: ToolbarStrings
  fileList: FileListStrings
  conflictDialog: ConflictDialogStrings
  restoreDialog: RestoreDialogStrings
  editor: EditorStrings
  notice: NoticeStrings
}

export type EditorLayoutStrings = {
  files: string
  code: string
  preview: string
}

export type StartScreenStrings = {
  productName: string
  description: string
  openFolder: string
  openFile: string
  localNote: string
  unsupportedTitle: string
  unsupportedDescription: string
}

export type ToolbarStrings = {
  label: string
  open: string
  save: string
  undo: string
  redo: string
  present: string
  unsaved: string
  modeLabel: string
  editMode: string
  interactMode: string
  modeUnavailable: string
}

export type FileListStrings = {
  title: string
  empty: string
  unsaved: string
  notEditable: string
}

export type ConflictDialogStrings = {
  title: string
  description: string
  overwrite: string
  loadDisk: string
  discardWarning: string
  cancel: string
}

export type RestoreDialogStrings = {
  title: string
  description: string
  pathsLabel: string
  diskChangedWarning: string
  restore: string
  discard: string
}

// 編集器の画面の中の名前のうち、どの表示部品のものでもないもの
export type EditorStrings = {
  // コード窓の書き込み欄のアクセシブルな名前
  codeLabel: string
  // プレビューのiframeのアクセシブルな名前(title)
  previewTitle: string
  // プロジェクトに走らせるHTMLのファイルが無いとき、プレビューの場所に出す
  noPreview: string
}

// エディタが知らせる失敗ごとの、1つの短い知らせ
export type NoticeMessages = {
  openFailed: string
  noTextFile: string
  readFailed: string
  writeFailed: string
  permissionDenied: string
  draftFailed: string
  // 一時保管できずに、開き直す(最初の画面へ戻る)のをやめたとき。理由と、どうすれば閉じられるか
  closeBlocked: string
  presentFailed: string
}

export type NoticeKind = keyof NoticeMessages

export type NoticeStrings = {
  dismiss: string
  messages: NoticeMessages
}
