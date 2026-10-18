// エディタがメモリに持つ、開いたプロジェクト。./start-session.tsが作り、./reduce-session.tsだけが変える
import type { EditorState, Text } from '@codemirror/state'
import type { FileFingerprint } from '@/utils/compare-fingerprint'

// コード窓で編集できるファイル
export type TextSessionFile = {
  kind: 'text'
  // 開いたフォルダからの相対パス('/'区切り。1つのファイルを開いたときはそのファイル名)
  path: string
  // 今の文字と、その元に戻す記録(./doc-state.ts)
  doc: EditorState
  // 最後に保存したか、ディスクから読んだ文字。docの改行の分け方で作った文書(./doc-state.tsのsavedDocOf)。
  // docの外に持つので、保存してもコード窓が見せる状態は変わらない
  savedDoc: Text
  // 読んだときか、最後に書いたときのディスクのファイル。保存はこれをディスクの今と比べる
  fingerprint: FileFingerprint
  // 保存が書く先
  handle: FileSystemFileHandle
}

// バイトのまま持つファイル(画像・フォント・正しいUTF-8でない文字)。使うのはプレビューだけ
export type BinarySessionFile = {
  kind: 'binary'
  path: string
  bytes: Uint8Array
  fingerprint: FileFingerprint
  handle: FileSystemFileHandle
}

export type SessionFile = TextSessionFile | BinarySessionFile

export type Session = {
  // 開くたびに新しくなる(同じフォルダを開き直したときも)。1つの開き方の中の編集と、新しく開いたこととを
  // 見分ける(./plan-drafts.ts・./build-preview.ts)
  openId: symbol
  // フォルダかファイルの名前。道具の棚に出す
  name: string
  // このプロジェクトの下書きを残すキー(src/utils/encode-draft.ts)
  projectKey: string
  // パスの順
  files: readonly SessionFile[]
  // コード窓に出しているファイル。いつもfilesの中の文字のファイルのパス
  activePath: string
}
