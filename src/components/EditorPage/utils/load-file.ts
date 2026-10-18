// ディスクから読んだファイル(src/lib/read-project.ts)を、エディタが持つ項目(./types.ts)に変える
import type { ProjectFile } from '@/lib/read-project'
import { createDocState } from './doc-state'
import type { SessionFile, TextSessionFile } from './types'

// 編集中のファイルを置き換えるために読み直したファイル(ディスクの版を取るとき)。ファイルがもう文字でなければ
// (バイトが正しいUTF-8でなくなった)投げる。そのときエディタは、今の文書を失わずに持ち続ける
export const toTextSessionFile = (file: ProjectFile): TextSessionFile => {
  if (file.kind !== 'text') throw new TypeError(`${file.path} is no longer a text file`)
  const doc = createDocState(file.path, file.text)
  return {
    kind: 'text',
    path: file.path,
    doc,
    // 読んだものがディスクにあるものなので、ファイルは変更なしで始まる
    savedDoc: doc.doc,
    fingerprint: file.fingerprint,
    handle: file.handle,
  }
}

// 開いているプロジェクトのファイル。文字のファイルは新しい文書の状態を持ち、バイナリのファイルはプレビューのために
// バイトを1回読む
export const toSessionFile = async (file: ProjectFile): Promise<SessionFile> => {
  if (file.kind === 'text') return toTextSessionFile(file)
  return {
    kind: 'binary',
    path: file.path,
    bytes: new Uint8Array(await file.blob.arrayBuffer()),
    fingerprint: file.fingerprint,
    handle: file.handle,
  }
}
