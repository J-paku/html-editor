// 本物のChromiumでのプレビュー。その文書は不透明なオリジンを持つ(allow-same-origin無しのsandbox)ので、テストは中を
// 見られない。渡したsrcdocとsandboxを、ブラウザが受け取るとおりに確かめる
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import EditorPageContainer from '@/components/EditorPage/container'
import { toDataUrl } from '@/utils/preview-data-url'
import {
  button,
  codeBox,
  data,
  fileRow,
  makeFolder,
  openFolderFromStart,
  previewFrame,
  resetStorage,
  srcdocOf,
  stubFolderPicker,
  strings,
  typeAtEnd,
  unsavedMark,
} from './editor-page.test-helper'

const CSS = 'h1 { color: teal }'

beforeEach(resetStorage)

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  vi.unstubAllGlobals()
})

const openSite = async (tree: Parameters<typeof makeFolder>[1]) => {
  stubFolderPicker(await makeFolder('site', tree))
  render(<EditorPageContainer {...data} />)
  await openFolderFromStart()
}

describe('preview', () => {
  it('runs the start HTML with its stylesheet put in as a data: URL, in a sandbox with scripts only', async () => {
    await openSite({
      'index.html': '<link rel="stylesheet" href="css/site.css"><h1>top</h1>',
      css: { 'site.css': CSS },
    })

    await expect.element(previewFrame()).toBeVisible()
    expect(srcdocOf()).toBe(
      `<link rel="stylesheet" href="${toDataUrl(CSS, 'text/css;charset=utf-8')}"><h1>top</h1>`
    )
    await expect.element(previewFrame()).toHaveAttribute('sandbox', 'allow-scripts')
  })

  it('follows the code a moment after typing stops, before saving', async () => {
    await openSite({ 'index.html': '<h1>top</h1>' })

    await typeAtEnd(' new')

    await expect.poll(srcdocOf).toBe('<h1>top</h1> new')
  })

  it('is not rebuilt while typing goes on: only once the code stays unchanged for 300 ms', async () => {
    await openSite({ 'index.html': '<h1>top</h1>' })
    await codeBox().click()
    // 開いたばかりのプロジェクトは、最初に落ち着くまではすぐに見せる。時間を差し替える前に落ち着かせる
    // (クリックによるカーソルの移動から300 ms)
    await new Promise(resolve => setTimeout(resolve, 400))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    await userEvent.keyboard('{Control>}{End}{/Control} new')
    // 画面は編集を描いた(保存していない印)ので、待たないプレビューならもう変わっている
    await expect.element(unsavedMark()).toBeVisible()
    vi.advanceTimersByTime(299)
    expect(srcdocOf()).toBe('<h1>top</h1>')

    vi.advanceTimersByTime(1)
    await expect.poll(srcdocOf).toBe('<h1>top</h1> new')
  })

  it('shows the edited stylesheet too', async () => {
    await openSite({ 'index.html': '<link rel="stylesheet" href="site.css">', 'site.css': CSS })
    await userEvent.click(fileRow('site.css'))

    await typeAtEnd(' em')

    const edited = toDataUrl(`${CSS} em`, 'text/css;charset=utf-8')
    await expect.poll(srcdocOf).toBe(`<link rel="stylesheet" href="${edited}">`)
  })

  it('runs another HTML file while it is in the code editor', async () => {
    await openSite({ 'index.html': '<p>top</p>', 'about.html': '<p>about</p>' })

    await userEvent.click(fileRow('about.html'))

    await expect.poll(srcdocOf).toBe('<p>about</p>')
  })

  it('without any HTML file, says there is nothing to preview and switches the present button off', async () => {
    await openSite({ 'site.css': CSS })

    await expect.element(page.getByText(strings.editor.noPreview, { exact: true })).toBeVisible()
    expect(previewFrame().query()).toBeNull()
    await expect.element(button(strings.toolbar.present)).toBeDisabled()
  })
})
