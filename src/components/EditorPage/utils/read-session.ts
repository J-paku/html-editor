// 画面のためにセッション(./types.ts)を読む。編集しているファイルと、保存していないもの
import { isSameFingerprint, type FileFingerprint } from '@/utils/compare-fingerprint'
import type { FileListItem } from '../components/FileList/index'
import { isDirty, restoredBaseOf } from './doc-state'
import type { Session, TextSessionFile } from './types'

// pathの文字のファイル。無ければ投げる(呼ぶ側はセッションがくれたパスだけを渡す)
export const textFileOf = (session: Session, path: string): TextSessionFile => {
  const found = session.files.find(
    (file): file is TextSessionFile => file.kind === 'text' && file.path === path
  )
  if (found === undefined) throw new RangeError(`no text file at ${path}`)
  return found
}

// コード窓に出しているファイル
export const activeFileOf = (session: Session): TextSessionFile =>
  textFileOf(session, session.activePath)

// 今の文字のもとになったディスクの版。保存はディスクの今の指紋をこれと比べ、一時保管はこれを開いたときの指紋として残す。
// ふつうはファイルの指紋(最後に読んだか書いた版)。今の文字がその版の上に復元した下書きを含むなら、下書きを作ったときの版
// (元に戻して復元が消えた後や、復元の後に保存して版が進んだ後は、ファイルの指紋に戻る)
export const baseFingerprintOf = (file: TextSessionFile): FileFingerprint => {
  const restored = restoredBaseOf(file.doc)
  return restored !== null && isSameFingerprint(restored.disk, file.fingerprint)
    ? restored.draft
    : file.fingerprint
}

// どれかの文字のファイルが、最後に保存したものと違うか(何も開いていなければfalse)
export const isSessionDirty = (session: Session | null): boolean =>
  session !== null &&
  session.files.some(file => file.kind === 'text' && isDirty(file.doc, file.savedDoc))

// ファイル一覧の行。セッションの順
export const fileListItemsOf = (session: Session): FileListItem[] =>
  session.files.map(file => ({
    path: file.path,
    isText: file.kind === 'text',
    hasUnsavedChanges: file.kind === 'text' && isDirty(file.doc, file.savedDoc),
  }))
