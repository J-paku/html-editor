// ファイルを書く。ファイルの中身を置き換えることと、開いたフォルダの下に新しいファイルを作ること。
// どちらも許可は求めない。先に利用者の操作からensureWritePermission(request-permission.ts)を呼ぶ
import { fingerprintOf, type FileFingerprint } from '@/utils/compare-fingerprint'
import { isErrorNamed } from '@/utils/match-error'
import { splitPath } from '@/utils/resolve-path'

export type CreatedFile = { handle: FileSystemFileHandle; fingerprint: FileFingerprint }

// 中身を全部置き換え、その後のファイルの指紋を返す(新しい「開いたときの」指紋として持つ)。
// 文字列は渡されたとおりにUTF-8で書く。
// createWritableは一時的な写しに書き、closeしたときにだけそれでファイルを置き換える。そのため書くのに失敗したら
// 写しを捨て(abort)、ディスクのファイルは元のまま残る
export const writeFileContent = async (
  handle: FileSystemFileHandle,
  content: string | Blob
): Promise<FileFingerprint> => {
  const writable = await handle.createWritable()
  try {
    await writable.write(content)
    await writable.close()
  } catch (error) {
    // 知らせるのは書くときのエラーで、写しを捨てるのに失敗したことではない
    await writable.abort().catch(() => undefined)
    throw error
  }
  return fingerprintOf(await handle.getFile())
}

const hasFile = (folder: FileSystemDirectoryHandle, name: string): Promise<boolean> =>
  folder.getFileHandle(name).then(
    () => true,
    error => {
      if (isErrorNamed(error, 'NotFoundError')) return false
      throw error
    }
  )

// path(開いたフォルダからの相対)にファイルを作る。途中のフォルダがまだ無ければそれも作る。
// そこにもうファイルがあればnullを返す。あるファイルは決して上書きしないので、別の名前を選ぶ。
// pathがファイルを指さないとき、または開いたフォルダの外へ出るとき('', 'a/..', '../a')はRangeErrorを投げる
export const createFileAt = async (
  directory: FileSystemDirectoryHandle,
  path: string,
  content: string | Blob
): Promise<CreatedFile | null> => {
  const segments = splitPath(path) ?? []
  const name = segments.pop()
  if (name === undefined) throw new RangeError(`not a file path inside the folder: ${path}`)
  let folder = directory
  for (const segment of segments) {
    folder = await folder.getDirectoryHandle(segment, { create: true })
  }
  if (await hasFile(folder, name)) return null
  const handle = await folder.getFileHandle(name, { create: true })
  return { handle, fingerprint: await writeFileContent(handle, content) }
}
