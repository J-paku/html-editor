// ブラウザのピッカー(File System Access API。ChromeとEdgeだけ)で、フォルダか1つのHTMLファイルを開く。
// ピッカーはTypeScriptのDOMの型に無いので、ここで使うメンバーには下で型を付ける
import { isErrorNamed } from '@/utils/match-error'

// 開いたもの。フォルダならフォルダのハンドル(その下のファイルを読み、作れる)。
// 1つのファイルならそのファイルのハンドルだけで、隣に書き込めるフォルダは無い
export type OpenedProject =
  | { kind: 'folder'; name: string; directory: FileSystemDirectoryHandle }
  | { kind: 'file'; name: string; file: FileSystemFileHandle }

type PickerGlobals = {
  showDirectoryPicker: (options: {
    id: string
    mode: 'read' | 'readwrite'
  }) => Promise<FileSystemDirectoryHandle>
  showOpenFilePicker: (options: {
    id: string
    types: { accept: Record<string, string[]> }[]
  }) => Promise<FileSystemFileHandle[]>
}

// メンバーは呼ぶ時点で読むので、それが無いブラウザはisFileAccessSupportedで見分けられる
const host = globalThis as typeof globalThis & PickerGlobals

// ピッカーは、このidで最後に開いた場所を覚えている
const PICKER_ID = 'html-editor'
const HTML_TYPES = [{ accept: { 'text/html': ['.html', '.htm'] } }]

// このブラウザに両方のピッカーがあるか。開く関数より先に呼ぶ(ピッカーが無いと、開く関数はTypeErrorを投げる)
export const isFileAccessSupported = (): boolean =>
  typeof host.showDirectoryPicker === 'function' && typeof host.showOpenFilePicker === 'function'

// 選ぶときに書き込みの許可も求める(mode readwrite)ので、後で保存するときに2度目の確認が出ない。
// 選ばずにピッカーを閉じたときはnullを返す。利用者の操作(クリック)から呼ぶ
export const openFolder = async (): Promise<OpenedProject | null> => {
  try {
    const directory = await host.showDirectoryPicker({ id: PICKER_ID, mode: 'readwrite' })
    return { kind: 'folder', name: directory.name, directory }
  } catch (error) {
    if (isErrorNamed(error, 'AbortError')) return null
    throw error
  }
}

// 1つのHTMLファイルを開く。書き込みの許可は保存するときに求める(ensureWritePermissionを参照)。
// 選ばずにピッカーを閉じたときはnullを返す。利用者の操作(クリック)から呼ぶ
export const openSingleFile = async (): Promise<OpenedProject | null> => {
  try {
    const [file] = await host.showOpenFilePicker({ id: PICKER_ID, types: HTML_TYPES })
    return { kind: 'file', name: file.name, file }
  } catch (error) {
    if (isErrorNamed(error, 'AbortError')) return null
    throw error
  }
}
