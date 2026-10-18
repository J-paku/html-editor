// 保存せずに再読み込みしたあと、同じフォルダを開くと一時保管(IndexedDB)の内容を復元できるか。
// 統合テストは画面を描き直して再読み込みの代わりにするだけで、ページを本当に読み込み直すことはテストの中では作れない。
// フォルダを選ぶ窓は自動テストが押せないので、ブラウザの中の保存場所(OPFS)のフォルダを返す形に差し替える
// (統合テストの __tests__/editor-page/editor-page.test-helper.ts と同じ差し替え。読み書き・IndexedDB は本物)
import { expect, test, type Page } from '@playwright/test'
import { strings } from '../content/strings'

// 開くフォルダ(OPFS の直下)の名前と、その中に置く開始 HTML
const FOLDER = 'site'
const ENTRY = 'index.html'
const ORIGINAL = '<p>a</p>'
const TYPED = 'X'

// 選ぶ窓の差し替え。再読み込みの後も効くよう、文書を読み込むたびに入れる
const stubPickers = (page: Page) =>
  page.addInitScript(folder => {
    const pickFolder = async () =>
      (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true })
    // ファイルを1つ開く窓は使わない。閉じられた時と同じ扱いにする
    const pickNothing = async () => {
      throw new DOMException('closed', 'AbortError')
    }
    Object.assign(window, { showDirectoryPicker: pickFolder, showOpenFilePicker: pickNothing })
  }, FOLDER)

// 開くフォルダに開始 HTML を置く(利用者のディスクにあるファイルの代わり)
const seedFolder = (page: Page) =>
  page.evaluate(
    async ({ folder, name, text }) => {
      const directory = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle(folder, { create: true })
      const writable = await (
        await directory.getFileHandle(name, { create: true })
      ).createWritable()
      await writable.write(text)
      await writable.close()
    },
    { folder: FOLDER, name: ENTRY, text: ORIGINAL }
  )

// ディスク(OPFS)にある開始 HTML の今の中身
const diskText = (page: Page) =>
  page.evaluate(
    async ({ folder, name }) => {
      const directory = await (await navigator.storage.getDirectory()).getDirectoryHandle(folder)
      return (await (await directory.getFileHandle(name)).getFile()).text()
    },
    { folder: FOLDER, name: ENTRY }
  )

// 一時保管された下書きの、パスと文字の組。データベースと store の名前は src/lib/store-draft.ts と同じ。
// 編集器より先に開いても同じ形(store 1つ)になるよう、作り方も idb-keyval の createStore に合わせる
const keptDrafts = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ path: string; text: string }[]>((resolve, reject) => {
        const request = indexedDB.open('html-editor')
        request.onupgradeneeded = () => request.result.createObjectStore('drafts')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const all = db.transaction('drafts').objectStore('drafts').getAll()
          all.onerror = () => reject(all.error)
          all.onsuccess = () => {
            db.close()
            resolve(all.result.map(({ path, text }) => ({ path, text })))
          }
        }
      })
  )

test('保存せずに再読み込みしても、同じフォルダを開くと一時保管した内容を未保存のまま復元できる', async ({
  page,
}) => {
  await stubPickers(page)
  await page.goto('/html-editor/')
  await seedFolder(page)
  const openFolder = page.getByRole('button', { name: strings.startScreen.openFolder, exact: true })
  const codeBox = page.getByRole('textbox', { name: strings.editor.codeLabel, exact: true })
  const unsavedMark = page.getByText(strings.toolbar.unsaved, { exact: true })

  await openFolder.click()
  await expect(codeBox, '開いたフォルダの開始 HTML がコード窓に出る').toHaveText(ORIGINAL)
  await codeBox.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(TYPED)
  await expect(unsavedMark, '打つと未保存の印が出る').toBeVisible()
  // 一時保管は入力が 500ms 止まってからまとめて書く。書き終わるまで待ってから読み込み直す
  await expect
    .poll(() => keptDrafts(page), { message: '入力した内容が IndexedDB に一時保管される' })
    .toEqual([{ path: ENTRY, text: `${ORIGINAL}${TYPED}` }])

  // 未保存の変更があると、閉じる・読み込み直す前にブラウザが確かめる(beforeunload)。ここでは離れる側を選ぶ。
  // 選ばないと Playwright が既定で閉じ(留まる側)、読み込み直しが終わらない
  const asked: string[] = []
  page.on('dialog', dialog => {
    asked.push(dialog.type())
    return dialog.accept()
  })
  await page.reload()
  expect(asked, '未保存のまま読み込み直すと、ブラウザが離れてよいか確かめる').toEqual([
    'beforeunload',
  ])
  await openFolder.click()

  const restoreDialog = page.getByRole('dialog', { name: strings.restoreDialog.title, exact: true })
  await expect(restoreDialog, '読み込み直して同じフォルダを開くと、復元するかを聞く').toBeVisible()
  await expect(restoreDialog.getByText(ENTRY, { exact: true })).toBeVisible()
  await restoreDialog
    .getByRole('button', { name: strings.restoreDialog.restore, exact: true })
    .click()

  await expect(restoreDialog).toBeHidden()
  await expect(codeBox, '一時保管した内容がコード窓に戻る').toHaveText(`${ORIGINAL}${TYPED}`)
  await expect(unsavedMark, '復元した内容はまだ保存していない').toBeVisible()
  expect(await diskText(page), '復元してもディスクのファイルは変わらない').toBe(ORIGINAL)
})
