// 画面に出す文字列の集まりの型。中身はcontent/strings.ts
export type Strings = {
  // <html lang> に入れる画面の言語
  lang: string
  // 画面の見出しと、文書の題名(<title>)
  title: string
  editorLayout: EditorLayoutStrings
  startScreen: StartScreenStrings
  fileList: FileListStrings
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

export type FileListStrings = {
  title: string
  empty: string
  unsaved: string
  notEditable: string
}
