// 編集器の画面の統合テストが共有する部品(画面そのものは各テストで描く)。
// 時間のほかに差し替えるのはファイルを選ぶ窓だけで、ブラウザ自身の保存場所(OPFS、navigator.storage.getDirectory())の
// フォルダとファイルを渡す。それは選んだフォルダと同じFileSystemDirectoryHandle・FileSystemFileHandleになる。
// 読む・書く・指紋・許可・IndexedDBは全部本物。
// 下書きを書けない状態も本物のIndexedDBで作る(breakDraftStore。DevToolsのプロトコルを通す)
import { clear, createStore } from 'idb-keyval'
import { expect, inject, onTestFinished, vi } from 'vitest'
import { cdp, page, userEvent, type Locator } from 'vitest/browser'
import { listDrafts } from '@/lib/store-draft'

// props。container.fixture.tsがnodeで組む
export const data = inject('editorPage')
export const strings = data.strings

// リテラルで書いたフォルダ。文字列かバイトはファイル、オブジェクトはフォルダ
export type Tree = { [name: string]: string | Uint8Array<ArrayBuffer> | Tree }

// src/lib/store-draft.tsと同じデータベースとストア
const draftStore = createStore('html-editor', 'drafts')

const writeFile = async (
  folder: FileSystemDirectoryHandle,
  name: string,
  content: string | Uint8Array<ArrayBuffer>
) => {
  const writable = await (await folder.getFileHandle(name, { create: true })).createWritable()
  await writable.write(content)
  await writable.close()
}

const writeTree = async (folder: FileSystemDirectoryHandle, tree: Tree) => {
  for (const [name, value] of Object.entries(tree)) {
    if (typeof value === 'string' || value instanceof Uint8Array)
      await writeFile(folder, name, value)
    else await writeTree(await folder.getDirectoryHandle(name, { create: true }), value)
  }
}

// OPFSと下書きを空にする。ほかのテストが残したものを、どのテストも見ないように
export const resetStorage = async () => {
  const root = await navigator.storage.getDirectory()
  const names: string[] = []
  for await (const name of root.keys()) names.push(name)
  for (const name of names) await root.removeEntry(name, { recursive: true })
  await clear(draftStore)
}

// OPFSの一番上の、treeを持つnameという名前のフォルダ(利用者のディスクのフォルダの代わり)
export const makeFolder = async (name: string, tree: Tree) => {
  const folder = await (
    await navigator.storage.getDirectory()
  ).getDirectoryHandle(name, {
    create: true,
  })
  await writeTree(folder, tree)
  return folder
}

const parentOf = async (folder: FileSystemDirectoryHandle, path: string) => {
  const segments = path.split('/')
  const name = segments.pop() ?? ''
  let parent = folder
  for (const segment of segments) parent = await parent.getDirectoryHandle(segment)
  return { parent, name }
}

// folderの下の、'/'区切りのパスにあるファイルのハンドル
export const fileAt = async (folder: FileSystemDirectoryHandle, path: string) => {
  const { parent, name } = await parentOf(folder, path)
  return parent.getFileHandle(name)
}

// pathのファイルが今ディスクに持つ文字。1バイトもたがえない(Blob.text()はバイト順マークを落とす)
export const textAt = async (folder: FileSystemDirectoryHandle, path: string) =>
  new TextDecoder('utf-8', { ignoreBOM: true }).decode(
    await (await (await fileAt(folder, path)).getFile()).arrayBuffer()
  )

// pathのファイルを置き換える(エディタの外での変更)。前と違う長さの中身を渡すこと。同じミリ秒の中でも指紋が変わるように
export const writeAt = async (
  folder: FileSystemDirectoryHandle,
  path: string,
  content: string | Uint8Array<ArrayBuffer>
) => {
  const { parent, name } = await parentOf(folder, path)
  await writeFile(parent, name, content)
}

// pathのファイルかフォルダを消す(エディタの外での削除)
export const removeAt = async (folder: FileSystemDirectoryHandle, path: string) => {
  const { parent, name } = await parentOf(folder, path)
  await parent.removeEntry(name, { recursive: true })
}

// フォルダを選ぶ窓がfolderを渡す
export const stubFolderPicker = (folder: FileSystemDirectoryHandle) => {
  vi.stubGlobal('showDirectoryPicker', async () => folder)
}

// ファイルを選ぶ窓がfileを渡す
export const stubFilePicker = (file: FileSystemFileHandle) => {
  vi.stubGlobal('showOpenFilePicker', async () => [file])
}

// fileのハンドルに、利用者がまだ答えていない書き込みの許可の確認を付ける(ブラウザの確認の窓は自動テストが押せないので、
// 答えはgrantで渡す)。そのハンドルを保存すると、grantを呼ぶまで許可を待つ
export const withPendingPermission = (file: FileSystemFileHandle) => {
  let answer: (state: PermissionState) => void = () => undefined
  const handle = Object.assign(file, {
    queryPermission: async () => 'prompt',
    requestPermission: () =>
      new Promise<PermissionState>(resolve => {
        answer = resolve
      }),
  })
  return { handle, grant: () => answer('granted') }
}

// どちらの選ぶ窓もerrorで失敗する(AbortErrorは、利用者が選ぶ窓を閉じたこと)
export const stubPickerFailure = (error: Error) => {
  const fail = async () => {
    throw error
  }
  vi.stubGlobal('showDirectoryPicker', fail)
  vi.stubGlobal('showOpenFilePicker', fail)
}

// 選ぶ窓の無いブラウザ(ChromeでもEdgeでもない)
export const removePickers = () => {
  vi.stubGlobal('showDirectoryPicker', undefined)
  vi.stubGlobal('showOpenFilePicker', undefined)
}

// テストが全画面にしていたら、全画面を出る
export const leaveFullscreen = async () => {
  if (document.fullscreenElement !== null) await document.exitFullscreen()
}

// DevToolsのプロトコルで、下書きのデータベースを消す。開いている接続は強制的に閉じられる(利用者がサイトのデータを
// 消したときと同じ)ので、道具とこの部品は次に使うときに開き直す
export const mendDraftStore = async () => {
  await cdp().send('IndexedDB.deleteDatabase', {
    securityOrigin: location.origin,
    databaseName: 'html-editor',
  })
}

// 下書きをもう残せない状態にする。データベースを、同じ名前と版で下書きのストアの無いものに置き換えるので、下書きの
// 読み書きは全部失敗する(NotFoundError)。先にディスクがいっぱいの状態(ページの割り当てを1バイトに縮める)を試したが、
// ページが前に下書きを書いていると、書き込みは通った(2026-10-18)。mendDraftStoreはデータベースをまた消し(下書きも一緒に)、
// テストが終わると自分で走る
export const breakDraftStore = async () => {
  onTestFinished(mendDraftStore)
  await mendDraftStore()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('html-editor', 1)
    request.onsuccess = () => {
      request.result.close()
      resolve()
    }
    request.onerror = () => reject(request.error)
  })
}

// 下書きのストアを、別のタブの書き込みが使っている状態にする。IndexedDBの本物のトランザクションを、問い合わせを
// 続けて開いたままにするので、その間、道具の下書きの読み書きは待つ。返す関数で離すと、待っていた読み書きが進む
// (離し終えるまで待つ)。テストが終わると自分で離す
export const holdDraftStore = async () => {
  let held = true
  let done = Promise.resolve()
  await new Promise<void>(started => {
    done = draftStore('readwrite', store => {
      return new Promise<void>(released => {
        const ask = () => {
          store.get('hold').onsuccess = () => {
            started()
            if (held) ask()
            else released()
          }
        }
        ask()
      })
    })
  })
  const release = async () => {
    held = false
    await done
  }
  onTestFinished(release)
  return release
}

// 焦点がこのページにあり、locatorの要素の中にあるか(開いた問いの窓の後ろの画面にも、ページの外にも無い)
export const focusStaysIn = (locator: Locator) =>
  document.hasFocus() && locator.element().contains(document.activeElement)

// 利用者に見えるもの。名前は、Testing Libraryの既定と同じく全体で当てる
export const button = (name: string) => page.getByRole('button', { name, exact: true })
export const codeBox = () =>
  page.getByRole('textbox', { name: strings.editor.codeLabel, exact: true })
export const previewFrame = () => page.getByTitle(strings.editor.previewTitle, { exact: true })
export const notice = () => page.getByRole('alert')
export const dialog = (title: string) => page.getByRole('dialog', { name: title, exact: true })
// ファイル一覧の、ファイルの行。アクセシブルな名前はパスで、保存していなければ空白と未保存が続く
export const fileRow = (path: string) =>
  page.getByRole('navigation', { name: strings.fileList.title }).getByTitle(path, { exact: true })
// プロジェクトに保存していない変更があることを示す、道具の棚の印
export const unsavedMark = () => page.getByText(strings.toolbar.unsaved, { exact: true })

// フォルダを選ぶ窓が渡すフォルダを開き、コード窓を待つ
export const openFolderFromStart = async () => {
  await userEvent.click(button(strings.startScreen.openFolder))
  await expect.element(codeBox()).toBeVisible()
}

// カーソルを文書の終わりへ動かし、keysを打つ(userEvent.keyboardの書き方)
export const typeAtEnd = async (keys: string) => {
  await codeBox().click()
  await userEvent.keyboard(`{Control>}{End}{/Control}${keys}`)
}

// projectKeyに残した下書きの文字。パスごと(遅れて来る書き込みを待つため)
export const draftTexts = async (projectKey: string) =>
  Object.fromEntries((await listDrafts(projectKey)).map(draft => [draft.path, draft.text]))

// プレビューが今走らせているsrcdoc
export const srcdocOf = () => previewFrame().element().getAttribute('srcdoc')
