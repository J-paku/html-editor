// 開いたフォルダかファイルのファイルを読むことと、ディスクのファイルの今の指紋を読むこと
import { fileKindOf, isSkippedFolder } from '@/utils/classify-entry'
import { fingerprintOf, type FileFingerprint } from '@/utils/compare-fingerprint'
import { decodeUtf8 } from '@/utils/decode-text'
import { isErrorNamed } from '@/utils/match-error'
import { comparePaths } from '@/utils/resolve-path'
import type { OpenedProject } from './open-project'

// 読んだ1つのファイル。pathは開いたフォルダからの相対('/'区切り。1つのファイルを開いたときはそのファイル名)。
// fingerprintは読んだ時点のディスクのファイル、handleは保存するときに書く先。
// バイトが正しいUTF-8でない文字のファイルはバイナリとして返すので、文字にしてからバイトに戻すことは決して無い
export type ProjectFile =
  | {
      path: string
      kind: 'text'
      text: string
      fingerprint: FileFingerprint
      handle: FileSystemFileHandle
    }
  | {
      path: string
      kind: 'binary'
      blob: Blob
      fingerprint: FileFingerprint
      handle: FileSystemFileHandle
    }

// フォルダが持つ2種類の項目。DOMの型が返すのは基底のFileSystemHandleで、kindでは絞り込めない
type FolderEntry = FileSystemFileHandle | FileSystemDirectoryHandle

// 1つのファイルを読む。ファイルを読み直すとき(外で変わった後に、ディスクの版を取るとき)にも使う。
// バイナリのファイルの中身はこの関数では読まず、blobにFileそのものを入れて返す。ただしプロジェクトを開くときは、
// 呼ぶ側(src/components/EditorPage/utils/load-file.ts)がプレビューのために全部のバイナリをすぐに読む
export const readProjectFile = async (
  handle: FileSystemFileHandle,
  path: string
): Promise<ProjectFile> => {
  const file = await handle.getFile()
  const fingerprint = fingerprintOf(file)
  if (fileKindOf(path) === 'text') {
    const text = decodeUtf8(await file.arrayBuffer())
    if (text !== null) return { path, kind: 'text', text, fingerprint, handle }
  }
  return { path, kind: 'binary', blob: file, fingerprint, handle }
}

const readFolder = async (
  directory: FileSystemDirectoryHandle,
  prefix: string
): Promise<ProjectFile[]> => {
  const files: ProjectFile[] = []
  for await (const entry of directory.values() as AsyncIterable<FolderEntry>) {
    const path = `${prefix}${entry.name}`
    if (entry.kind === 'file') files.push(await readProjectFile(entry, path))
    else if (!isSkippedFolder(entry.name)) files.push(...(await readFolder(entry, `${path}/`)))
  }
  return files
}

// 開いたフォルダの全部のファイルをパスの順に並べたもの(.gitやnode_modulesなどのフォルダは飛ばす)、
// または開いた1つのファイル
export const readProjectFiles = async (project: OpenedProject): Promise<ProjectFile[]> => {
  if (project.kind === 'file') return [await readProjectFile(project.file, project.name)]
  const files = await readFolder(project.directory, '')
  return files.sort((a, b) => comparePaths(a.path, b.path))
}

// ディスクのファイルの今の指紋。読んだときに取った指紋と比べるために使う。
// ファイルがもう無ければnullを返す
export const readFingerprint = async (
  handle: FileSystemFileHandle
): Promise<FileFingerprint | null> => {
  try {
    return fingerprintOf(await handle.getFile())
  } catch (error) {
    if (isErrorNamed(error, 'NotFoundError')) return null
    throw error
  }
}
