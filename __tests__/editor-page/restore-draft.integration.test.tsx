// 本物のChromiumでの下書き。編集はIndexedDBに残り、画面が消えた後(描き直した後)に同じプロジェクトを開き直すと、
// 戻すことを持ちかける。復元すると保存していない文字として入り、破棄すると消え、Escapeは後のために残す
// (閉じた後に問いのファイルの文字を変えると、また尋ねる)
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import EditorPageContainer from '@/components/EditorPage/container'
import {
  button,
  codeBox,
  data,
  dialog,
  breakDraftStore,
  draftTexts,
  fileRow,
  focusStaysIn,
  holdDraftStore,
  leaveFullscreen,
  makeFolder,
  notice,
  openFolderFromStart,
  resetStorage,
  stubFolderPicker,
  strings,
  textAt,
  typeAtEnd,
  unsavedMark,
} from './editor-page.test-helper'

let folder: FileSystemDirectoryHandle

beforeEach(async () => {
  await resetStorage()
  folder = await makeFolder('site', { 'index.html': '<p>a</p>', 'site.css': 'p {}' })
  stubFolderPicker(folder)
})

afterEach(async () => {
  vi.useRealTimers()
  await leaveFullscreen()
  cleanup()
  vi.unstubAllGlobals()
})

const restoreDialog = () => dialog(strings.restoreDialog.title)

// index.htmlにXを打ち、その下書きが残るまで待つ
const editAndKeep = async () => {
  render(<EditorPageContainer {...data} />)
  await openFolderFromStart()
  await typeAtEnd('X')
  await expect.poll(() => draftTexts('folder:site')).toEqual({ 'index.html': '<p>a</p>X' })
}

// 下書きを書く予定は、セッションが最後に変わってから500 ms後に来る。それより十分長く待つ(来ないことを確かめるため)
const waitPastDraftDelay = () => new Promise(resolve => setTimeout(resolve, 1000))

// 画面が消え(タブを閉じ)、描き直し、同じフォルダを開く
const reopen = async () => {
  cleanup()
  render(<EditorPageContainer {...data} />)
  await openFolderFromStart()
  await expect.element(restoreDialog()).toBeVisible()
}

describe('keeping drafts', () => {
  it('keeps the text of the edited file a moment after typing stops', async () => {
    await editAndKeep()
    await typeAtEnd('Y')

    await expect.poll(() => draftTexts('folder:site')).toEqual({ 'index.html': '<p>a</p>XY' })
  })

  it('writes nothing while typing goes on, then the whole edit once it stays unchanged for 500 ms', async () => {
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()
    await codeBox().click()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    await userEvent.keyboard('{Control>}{End}{/Control}XYZ')
    await expect.element(unsavedMark()).toBeVisible()
    vi.advanceTimersByTime(499)
    // 下書きを読むのは、その前に始まった書き込みを全部待つので、早すぎる書き込みがあればここに出る
    expect(await draftTexts('folder:site')).toEqual({})

    vi.advanceTimersByTime(1)
    await expect.poll(() => draftTexts('folder:site')).toEqual({ 'index.html': '<p>a</p>XYZ' })
  })

  it('drops the draft when undo brings the file back to its saved text', async () => {
    await editAndKeep()

    await userEvent.click(button(strings.toolbar.undo))

    await expect.poll(() => draftTexts('folder:site')).toEqual({})
  })

  it('after a write failed, moving the cursor or selecting writes nothing and tells nothing again', async () => {
    await breakDraftStore()
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()
    await expect.element(notice()).toHaveTextContent(strings.notice.messages.draftFailed)
    await userEvent.click(button(strings.notice.dismiss))
    await typeAtEnd('Z')
    await expect.element(notice()).toHaveTextContent(strings.notice.messages.draftFailed)
    await userEvent.click(button(strings.notice.dismiss))

    await codeBox().click()
    await userEvent.keyboard('{ArrowLeft}{Shift>}{ArrowLeft}{/Shift}')
    await waitPastDraftDelay()

    expect(notice().query()).toBeNull()
    // 下書きはまだ書けないまま: 文字を変えれば、また書こうとして知らせる
    await userEvent.keyboard('Y')
    await expect.element(notice()).toHaveTextContent(strings.notice.messages.draftFailed)
  })

  it('leaving the page keeps the waiting edit at once; a tab still in sight waits as before', async () => {
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()
    await codeBox().click()
    // 遅らせた書き込みは自分では来ない。下書きを読むのは、その前に始まった書き込みを全部待つので、expect.poll
    // (偽の時間を進めてしまう)を使わずに読む
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await userEvent.keyboard('{Control>}{End}{/Control}Z')
    await expect.element(unsavedMark()).toBeVisible()

    // タブの見え方が変わったが、まだ見えている(ヘッドレスのページは隠せない)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(await draftTexts('folder:site')).toEqual({})

    window.dispatchEvent(new PageTransitionEvent('pagehide'))
    expect(await draftTexts('folder:site')).toEqual({ 'index.html': '<p>a</p>Z' })
  })
})

describe('offering drafts back', () => {
  it('lists the files with drafts, focuses restore (it loses nothing), and warns of no disk change', async () => {
    await editAndKeep()

    await reopen()

    await expect.element(restoreDialog()).toHaveTextContent('index.html')
    expect(restoreDialog().getByText(strings.restoreDialog.diskChangedWarning).query()).toBeNull()
    await expect.element(button(strings.restoreDialog.restore)).toHaveFocus()
  })

  it('keeps the focus off the screen behind the question', async () => {
    await editAndKeep()
    await reopen()
    await expect.element(button(strings.restoreDialog.restore)).toHaveFocus()
    expect(focusStaysIn(restoreDialog()), 'the page has the focus to begin with').toBe(true)

    for (let step = 1; step <= 4; step += 1) {
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
      expect(focusStaysIn(restoreDialog()), `after Shift+Tab ${step}`).toBe(true)
    }
    for (let step = 1; step <= 4; step += 1) {
      await userEvent.keyboard('{Tab}')
      expect(focusStaysIn(restoreDialog()), `after Tab ${step}`).toBe(true)
    }
  })

  it('Escape closes the question without an answer: the file stays as on disk and the drafts stay for later', async () => {
    await editAndKeep()
    await reopen()

    await userEvent.keyboard('{Escape}')

    await expect.element(restoreDialog()).not.toBeInTheDocument()
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>$/)
    expect(unsavedMark().query()).toBeNull()
    expect(await draftTexts('folder:site')).toEqual({ 'index.html': '<p>a</p>X' })
  })

  it('Escape closes the question and does nothing else; typing in a file of the question (not moving the cursor) asks again, and closing gives the focus back', async () => {
    await editAndKeep()
    await reopen()
    await userEvent.keyboard('{Escape}')
    await expect.element(restoreDialog()).not.toBeInTheDocument()

    await codeBox().click()
    await userEvent.keyboard('{End}{Home}{Shift>}{End}{/Shift}')
    expect(restoreDialog().query()).toBeNull()

    await userEvent.keyboard('{End}Q')
    await expect.element(restoreDialog()).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await expect.element(restoreDialog()).not.toBeInTheDocument()
    await expect.element(codeBox()).toHaveFocus()
  })

  it('while the question is closed, edits and saves never write over or drop the kept draft; restoring when it asks again brings the kept text back', async () => {
    await editAndKeep()
    await reopen()
    await userEvent.keyboard('{Escape}')
    await typeAtEnd('Q')
    await expect.element(restoreDialog()).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(button(strings.toolbar.save))
    await expect.poll(() => textAt(folder, 'index.html')).toBe('<p>a</p>Q')
    await waitPastDraftDelay()
    expect(await draftTexts('folder:site')).toEqual({ 'index.html': '<p>a</p>X' })

    await typeAtEnd('R')
    await userEvent.click(button(strings.restoreDialog.restore))

    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>X$/)
    await expect.element(unsavedMark()).toBeVisible()
    expect(await draftTexts('folder:site')).toEqual({ 'index.html': '<p>a</p>X' })
  })

  it('discarding when the question asks again drops the kept drafts, and the edits are kept as usual after that', async () => {
    await editAndKeep()
    await reopen()
    await userEvent.keyboard('{Escape}')
    await typeAtEnd('Q')
    await expect.element(restoreDialog()).toBeVisible()

    await userEvent.click(button(strings.restoreDialog.discard))

    await expect.element(restoreDialog()).not.toBeInTheDocument()
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>Q$/)
    await expect.poll(() => draftTexts('folder:site')).toEqual({ 'index.html': '<p>a</p>Q' })
    await typeAtEnd('R')
    await expect.poll(() => draftTexts('folder:site')).toEqual({ 'index.html': '<p>a</p>QR' })
  })

  it('while the question is closed, edits of files outside it are kept as usual and do not ask', async () => {
    await editAndKeep()
    await reopen()
    await userEvent.keyboard('{Escape}')

    await userEvent.click(fileRow('site.css'))
    await typeAtEnd('Y')

    await expect
      .poll(() => draftTexts('folder:site'))
      .toEqual({ 'index.html': '<p>a</p>X', 'site.css': 'p {}Y' })
    expect(restoreDialog().query()).toBeNull()
  })

  it('a question that opens while the preview is on the whole screen leaves the whole screen first, so it can be seen and answered', async () => {
    await editAndKeep()
    cleanup()
    render(<EditorPageContainer {...data} />)
    const release = await holdDraftStore()
    await openFolderFromStart()
    await userEvent.click(button(strings.toolbar.present))
    await expect.poll(() => document.fullscreenElement).not.toBeNull()

    await release()

    await expect.element(restoreDialog()).toBeVisible()
    await expect.poll(() => document.fullscreenElement).toBeNull()
    await expect.element(button(strings.restoreDialog.restore)).toHaveFocus()
    await userEvent.click(button(strings.restoreDialog.restore))
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>X$/)
  })

  it('restoring shows the kept text as unsaved, leaves the file on disk alone, and can be undone', async () => {
    await editAndKeep()
    await reopen()

    await userEvent.click(button(strings.restoreDialog.restore))

    expect(restoreDialog().query()).toBeNull()
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>X$/)
    await expect.element(unsavedMark()).toBeVisible()
    expect(await textAt(folder, 'index.html')).toBe('<p>a</p>')

    await userEvent.click(button(strings.toolbar.undo))
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>$/)
  })

  it('discarding shows the file as it is on disk and drops every draft of the project', async () => {
    await editAndKeep()
    await reopen()

    await userEvent.click(button(strings.restoreDialog.discard))

    expect(restoreDialog().query()).toBeNull()
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>$/)
    expect(unsavedMark().query()).toBeNull()
    await expect.poll(() => draftTexts('folder:site')).toEqual({})
  })
})
