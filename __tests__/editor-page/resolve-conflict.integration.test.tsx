// 本物のChromiumで、開いた後にエディタの外で変わったファイル。保存は上書きせずに、どうするかを尋ね(自分の内容で上書き・
// ディスクの版を読む・キャンセル。Escapeはキャンセル)、途中の失敗を知らせる
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import EditorPageContainer from '@/components/EditorPage/container'
import {
  button,
  codeBox,
  data,
  dialog,
  focusStaysIn,
  makeFolder,
  notice,
  openFolderFromStart,
  removeAt,
  resetStorage,
  stubFolderPicker,
  strings,
  textAt,
  typeAtEnd,
  unsavedMark,
  writeAt,
} from './editor-page.test-helper'

beforeEach(resetStorage)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const conflictDialog = () => dialog(strings.conflictDialog.title)

// フォルダを開き、出しているファイルの終わりにXを打ち、changeでディスクを変えてから保存を押す
const editThenSave = async (
  tree: Parameters<typeof makeFolder>[1],
  change: (folder: FileSystemDirectoryHandle) => Promise<void>
) => {
  const folder = await makeFolder('site', tree)
  stubFolderPicker(folder)
  render(<EditorPageContainer {...data} />)
  await openFolderFromStart()
  await typeAtEnd('X')
  await change(folder)
  await userEvent.click(button(strings.toolbar.save))
  return folder
}

const changedOutside = (folder: FileSystemDirectoryHandle) =>
  writeAt(folder, 'index.html', '<p>changed outside</p>')

describe('saving a file that changed on disk', () => {
  it('asks what to do, naming the file, with the focus on cancel (it loses nothing), and writes nothing yet', async () => {
    const folder = await editThenSave({ 'index.html': '<p>a</p>' }, changedOutside)

    await expect.element(conflictDialog()).toBeVisible()
    await expect.element(conflictDialog()).toHaveTextContent('index.html')
    await expect.element(button(strings.conflictDialog.cancel)).toHaveFocus()
    expect(await textAt(folder, 'index.html')).toBe('<p>changed outside</p>')
  })

  it('keeps the focus off the screen behind the question', async () => {
    await editThenSave({ 'index.html': '<p>a</p>' }, changedOutside)
    await expect.element(button(strings.conflictDialog.cancel)).toHaveFocus()
    expect(focusStaysIn(conflictDialog()), 'the page has the focus to begin with').toBe(true)

    for (let step = 1; step <= 4; step += 1) {
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
      expect(focusStaysIn(conflictDialog()), `after Shift+Tab ${step}`).toBe(true)
    }
    for (let step = 1; step <= 4; step += 1) {
      await userEvent.keyboard('{Tab}')
      expect(focusStaysIn(conflictDialog()), `after Tab ${step}`).toBe(true)
    }
  })

  it('cancel and Escape give the focus back to the save button pressed', async () => {
    await editThenSave({ 'index.html': '<p>a</p>' }, changedOutside)
    await expect.element(conflictDialog()).toBeVisible()

    await userEvent.click(button(strings.conflictDialog.cancel))
    await expect.element(button(strings.toolbar.save)).toHaveFocus()

    await userEvent.click(button(strings.toolbar.save))
    await expect.element(conflictDialog()).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await expect.element(button(strings.toolbar.save)).toHaveFocus()
  })

  it('Escape cancels: the question closes and my edit stays unsaved', async () => {
    const folder = await editThenSave({ 'index.html': '<p>a</p>' }, changedOutside)
    await expect.element(conflictDialog()).toBeVisible()

    await userEvent.keyboard('{Escape}')

    await expect.element(conflictDialog()).not.toBeInTheDocument()
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>X$/)
    await expect.element(unsavedMark()).toBeVisible()
    expect(await textAt(folder, 'index.html')).toBe('<p>changed outside</p>')
  })

  it('overwrite writes my text over the disk version', async () => {
    const folder = await editThenSave({ 'index.html': '<p>a</p>' }, changedOutside)

    await userEvent.click(button(strings.conflictDialog.overwrite))

    await expect.poll(() => textAt(folder, 'index.html')).toBe('<p>a</p>X')
    expect(conflictDialog().query()).toBeNull()
    await expect.element(button(strings.toolbar.save)).toBeDisabled()
  })

  it('taking the disk version shows it, drops my edit and its draft, and leaves the disk as it is', async () => {
    const folder = await editThenSave({ 'index.html': '<p>a</p>' }, changedOutside)

    await userEvent.click(button(strings.conflictDialog.loadDisk))

    await expect.element(codeBox()).toHaveTextContent(/^<p>changed outside<\/p>$/)
    expect(unsavedMark().query()).toBeNull()
    expect(await textAt(folder, 'index.html')).toBe('<p>changed outside</p>')
  })

  it('cancel closes the question and keeps my edit unsaved', async () => {
    const folder = await editThenSave({ 'index.html': '<p>a</p>' }, changedOutside)

    await userEvent.click(button(strings.conflictDialog.cancel))

    expect(conflictDialog().query()).toBeNull()
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>X$/)
    await expect.element(unsavedMark()).toBeVisible()
    expect(await textAt(folder, 'index.html')).toBe('<p>changed outside</p>')
  })

  it('treats a file deleted on disk as changed, and overwrite writes it again', async () => {
    const folder = await editThenSave({ 'index.html': '<p>a</p>' }, folder =>
      removeAt(folder, 'index.html')
    )
    await expect.element(conflictDialog()).toBeVisible()

    await userEvent.click(button(strings.conflictDialog.overwrite))

    await expect.poll(() => textAt(folder, 'index.html')).toBe('<p>a</p>X')
  })
})

describe('failures while resolving', () => {
  it('tells that saving failed when the file cannot be written (its folder was deleted)', async () => {
    await editThenSave({ pages: { 'about.html': '<p>a</p>' } }, folder => removeAt(folder, 'pages'))
    await expect.element(conflictDialog()).toBeVisible()

    await userEvent.click(button(strings.conflictDialog.overwrite))

    await expect.element(notice()).toHaveTextContent(strings.notice.messages.writeFailed)
    await expect.element(unsavedMark()).toBeVisible()
    await expect.element(button(strings.toolbar.save)).toBeEnabled()
  })

  it.each([
    ['was deleted', (folder: FileSystemDirectoryHandle) => removeAt(folder, 'index.html')],
    [
      'is no longer UTF-8 text',
      (folder: FileSystemDirectoryHandle) =>
        writeAt(folder, 'index.html', new Uint8Array([0x3c, 0x70, 0x3e, 0xc3, 0x28])),
    ],
  ])(
    'tells that the disk version could not be read when the file %s, and keeps my edit',
    async (_, change) => {
      await editThenSave({ 'index.html': '<p>a</p>' }, change)
      await expect.element(conflictDialog()).toBeVisible()

      await userEvent.click(button(strings.conflictDialog.loadDisk))

      await expect.element(notice()).toHaveTextContent(strings.notice.messages.readFailed)
      await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>X$/)
      await expect.element(unsavedMark()).toBeVisible()
    }
  )
})
