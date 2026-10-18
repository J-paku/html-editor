// 本物のChromiumでの、ページを離れる前のブラウザの警告。テストの中からはページを閉じられないので、windowに
// beforeunloadのイベントを送る。取り消されたイベントが、ブラウザに尋ねさせる
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import EditorPageContainer from '@/components/EditorPage/container'
import {
  button,
  data,
  makeFolder,
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
  folder = await makeFolder('site', { 'index.html': '<p>a</p>' })
  stubFolderPicker(folder)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// 今離れると、ブラウザが尋ねるか
const leavingAsks = () => {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

describe('leaving the page', () => {
  it('does not ask while nothing is unsaved', async () => {
    render(<EditorPageContainer {...data} />)
    expect(leavingAsks(), 'on the start screen').toBe(false)

    await openFolderFromStart()
    expect(leavingAsks(), 'with the project open and unchanged').toBe(false)
  })

  it('asks while there are unsaved changes, and no longer after saving', async () => {
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()
    await typeAtEnd('X')
    await expect.element(unsavedMark()).toBeVisible()

    expect(leavingAsks()).toBe(true)

    await userEvent.click(button(strings.toolbar.save))
    await expect.poll(() => textAt(folder, 'index.html')).toBe('<p>a</p>X')
    await expect.poll(leavingAsks).toBe(false)
  })

  it('no longer asks once the screen is gone', async () => {
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()
    await typeAtEnd('X')
    await expect.poll(leavingAsks).toBe(true)

    cleanup()

    expect(leavingAsks()).toBe(false)
  })
})
