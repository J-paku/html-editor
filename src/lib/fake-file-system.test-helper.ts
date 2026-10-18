// libのテストのための、メモリの中だけのFile System Accessのハンドルの代わり(nodeにはそのハンドルが無い)。
// あるのはlibが呼ぶメンバーだけ。どの偽物もPartial<>を通すので、libが新しく呼び始めたのに偽物に無いメンバーは、
// 黙って通らずにテストの失敗として出る
type FakeContent = string | Uint8Array<ArrayBuffer>

// リテラルで書いたフォルダ。文字列かバイト列はファイル、オブジェクトはフォルダ
export type FakeTree = { [name: string]: FakeContent | FakeTree }

type FakeEntry = FileSystemFileHandle | FileSystemDirectoryHandle

// どの偽物のファイルも、最初はこの最終更新時刻を持つ
export const FAKE_MODIFIED = 1_700_000_000_000

const notFound = (name: string) => new DOMException(`${name} was not found`, 'NotFoundError')
const typeMismatch = (name: string) =>
  new DOMException(`${name} is another kind`, 'TypeMismatchError')

// 書かれたものを持ち続けるファイル。writableをcloseすると中身を置き換え、本物の保存と同じく
// 最終更新時刻を1進める
export const fakeFile = (
  name: string,
  content: FakeContent = '',
  lastModified = FAKE_MODIFIED
): FileSystemFileHandle => {
  const state = { blob: new Blob([content]), lastModified }
  return {
    kind: 'file',
    name,
    getFile: async () => new File([state.blob], name, { lastModified: state.lastModified }),
    createWritable: async () => {
      const chunks: (string | Blob)[] = []
      return {
        write: async (chunk: string | Blob) => {
          chunks.push(chunk)
        },
        close: async () => {
          state.blob = new Blob(chunks)
          state.lastModified += 1
        },
        abort: async () => {
          chunks.length = 0
        },
      } as Partial<FileSystemWritableFileStream> as FileSystemWritableFileStream
    },
  } as Partial<FileSystemFileHandle> as FileSystemFileHandle
}

const isContent = (value: FakeContent | FakeTree): value is FakeContent =>
  typeof value === 'string' || value instanceof Uint8Array

// フォルダ。項目はリテラルに書いた順に並ぶ。createを付けると無い項目を作る
export const fakeDirectory = (name: string, tree: FakeTree = {}): FileSystemDirectoryHandle => {
  const children = new Map<string, FakeEntry>(
    Object.entries(tree).map(([childName, value]) => [
      childName,
      isContent(value) ? fakeFile(childName, value) : fakeDirectory(childName, value),
    ])
  )
  return {
    kind: 'directory',
    name,
    values: async function* () {
      yield* children.values()
    },
    getDirectoryHandle: async (childName: string, options?: FileSystemGetDirectoryOptions) => {
      const child = children.get(childName)
      if (child === undefined) {
        if (options?.create !== true) throw notFound(childName)
        const created = fakeDirectory(childName)
        children.set(childName, created)
        return created
      }
      if (child.kind !== 'directory') throw typeMismatch(childName)
      return child
    },
    getFileHandle: async (childName: string, options?: FileSystemGetFileOptions) => {
      const child = children.get(childName)
      if (child === undefined) {
        if (options?.create !== true) throw notFound(childName)
        const created = fakeFile(childName)
        children.set(childName, created)
        return created
      }
      if (child.kind !== 'file') throw typeMismatch(childName)
      return child
    },
  } as Partial<FileSystemDirectoryHandle> as FileSystemDirectoryHandle
}

// 偽物のフォルダの下の、'/'区切りのパスにあるハンドル(途中のフォルダはあらかじめ無ければならない)
export const fileAt = async (
  directory: FileSystemDirectoryHandle,
  path: string
): Promise<FileSystemFileHandle> => {
  const segments = path.split('/')
  const name = segments.pop() ?? ''
  let folder = directory
  for (const segment of segments) folder = await folder.getDirectoryHandle(segment)
  return folder.getFileHandle(name)
}

// 偽物のファイルが今持っている文字
export const textAt = async (directory: FileSystemDirectoryHandle, path: string): Promise<string> =>
  (await (await fileAt(directory, path)).getFile()).text()
