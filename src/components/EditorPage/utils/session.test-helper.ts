// エディタのutilsの単体テストのための、セッション(./types.ts)の組み立て
import { fakeFile } from '@/lib/fake-file-system.test-helper'
import type { FileFingerprint } from '@/utils/compare-fingerprint'
import { createDocState } from './doc-state'
import type { BinarySessionFile, Session, SessionFile, TextSessionFile } from './types'

export const FINGERPRINT: FileFingerprint = { lastModified: 1000, size: 10 }

// 読んだばかりの文字のファイル。保存した時点の文書はその文字
export const textFile = (
  path: string,
  text = `<p>${path}</p>`,
  fingerprint = FINGERPRINT
): TextSessionFile => {
  const doc = createDocState(path, text)
  return { kind: 'text', path, doc, savedDoc: doc.doc, fingerprint, handle: fakeFile(path, text) }
}

export const binaryFile = (path: string, bytes = new Uint8Array([1, 2, 3])): BinarySessionFile => ({
  kind: 'binary',
  path,
  bytes,
  fingerprint: FINGERPRINT,
  handle: fakeFile(path, bytes),
})

export const sessionOf = (
  files: readonly SessionFile[],
  activePath = files.find(file => file.kind === 'text')?.path ?? '',
  projectKey = 'folder:site'
): Session => ({ openId: Symbol(projectKey), name: 'site', projectKey, files, activePath })

// fileの文書の状態の終わりにinsertを足したもの(入力の代わり)
export const typed = (file: TextSessionFile, insert: string): TextSessionFile => ({
  ...file,
  doc: file.doc.update({ changes: { from: file.doc.doc.length, insert } }).state,
})
