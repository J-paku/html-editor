// 本物のChromiumでのコード窓の編集。保存していない印(ファイルごとと、プロジェクトの)と、道具の棚の元に戻す・やり直す
// (出しているファイルの記録に効く)
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import EditorPageContainer from '@/components/EditorPage/container'
import {
  button,
  codeBox,
  data,
  fileRow,
  makeFolder,
  openFolderFromStart,
  resetStorage,
  stubFolderPicker,
  strings,
  typeAtEnd,
  unsavedMark,
} from './editor-page.test-helper'

beforeEach(async () => {
  await resetStorage()
  stubFolderPicker(await makeFolder('site', { 'index.html': '<p>a</p>', 'site.css': 'p {}' }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const undoButton = () => button(strings.toolbar.undo)
const redoButton = () => button(strings.toolbar.redo)

describe('editing', () => {
  it('starts with nothing unsaved and nothing to undo or redo', async () => {
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()

    expect(unsavedMark().query()).toBeNull()
    await expect.element(fileRow('index.html')).toHaveAccessibleName('index.html')
    await expect.element(undoButton()).toBeDisabled()
    await expect.element(redoButton()).toBeDisabled()
    await expect.element(button(strings.toolbar.save)).toBeDisabled()
  })

  it('typing marks the file and the project as unsaved, and enables save and undo', async () => {
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()

    await typeAtEnd('X')

    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>X$/)
    await expect.element(unsavedMark()).toBeVisible()
    await expect
      .element(fileRow('index.html'))
      .toHaveAccessibleName(`index.html ${strings.fileList.unsaved}`)
    await expect.element(fileRow('site.css')).toHaveAccessibleName('site.css')
    await expect.element(button(strings.toolbar.save)).toBeEnabled()
    await expect.element(undoButton()).toBeEnabled()
  })

  it('moving the cursor alone marks nothing as unsaved', async () => {
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()

    await codeBox().click()
    await userEvent.keyboard('{End}{Home}')

    expect(unsavedMark().query()).toBeNull()
    await expect.element(undoButton()).toBeDisabled()
  })

  it('the toolbar undoes and redoes the typing in the file shown, and the unsaved marks follow', async () => {
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()
    await typeAtEnd('X')
    await expect.element(undoButton()).toBeEnabled()

    await userEvent.click(undoButton())

    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>$/)
    await expect.element(redoButton()).toBeEnabled()
    expect(unsavedMark().query()).toBeNull()

    await userEvent.click(redoButton())

    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>X$/)
    await expect.element(unsavedMark()).toBeVisible()
    await expect.element(redoButton()).toBeDisabled()
  })

  it('keeps a separate history per file', async () => {
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()
    await typeAtEnd('X')

    await userEvent.click(fileRow('site.css'))
    await expect.element(codeBox()).toHaveTextContent(/^p \{\}$/)

    await expect.element(undoButton()).toBeDisabled()
    await expect.element(unsavedMark()).toBeVisible()

    await userEvent.click(fileRow('index.html'))
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>X$/)
    await expect.element(undoButton()).toBeEnabled()
  })
})
