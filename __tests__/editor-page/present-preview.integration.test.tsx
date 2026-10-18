// 本物のChromiumで、プレビューを全画面で見せる(Fullscreen API。クリックは本物の利用者の操作)
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import EditorPageContainer from '@/components/EditorPage/container'
import {
  button,
  data,
  leaveFullscreen,
  makeFolder,
  notice,
  openFolderFromStart,
  previewFrame,
  resetStorage,
  stubFolderPicker,
  strings,
} from './editor-page.test-helper'

beforeEach(async () => {
  await resetStorage()
  stubFolderPicker(await makeFolder('site', { 'index.html': '<h1>slide 1</h1>' }))
})

afterEach(async () => {
  await leaveFullscreen()
  cleanup()
  vi.unstubAllGlobals()
})

describe('present', () => {
  it('puts the preview on the whole screen', async () => {
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()

    await userEvent.click(button(strings.toolbar.present))

    await expect
      .poll(() => document.fullscreenElement?.contains(previewFrame().element()))
      .toBe(true)
    expect(notice().query()).toBeNull()
  })

  it('puts the focus into the preview, so the arrow keys and Space go to the slides', async () => {
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()

    await userEvent.click(button(strings.toolbar.present))

    await expect.poll(() => document.activeElement).toBe(previewFrame().element())
  })

  it('tells the user when the browser refuses the whole screen', async () => {
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()
    // 全画面には新しい利用者の操作が要り、全画面に入るとその操作を使い切る。最後のクリックが残した分を使い切ってから、
    // スクリプトで(利用者の操作でなく)「全画面で表示」を押す。ブラウザは断る
    await document.documentElement.requestFullscreen()
    await leaveFullscreen()
    button(strings.toolbar.present)
      .element()
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await expect.element(notice()).toHaveTextContent(strings.notice.messages.presentFailed)
    expect(document.fullscreenElement).toBeNull()
  })
})
