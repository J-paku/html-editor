// 本物のChromiumでの、編集器の画面の最初の画面。ファイルを選ぶ窓のあるブラウザと無いブラウザに見えるものと、
// 静的なHTMLが作り直されずにハイドレートされること
import { cleanup, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { page } from 'vitest/browser'
import EditorPageContainer from '@/components/EditorPage/container'
import {
  button,
  data,
  makeFolder,
  removePickers,
  resetStorage,
  stubFolderPicker,
  strings,
} from './editor-page.test-helper'

beforeEach(resetStorage)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('start screen', () => {
  it('in Chrome or Edge, offers both ways to open, enabled, without the browser notice', async () => {
    stubFolderPicker(await makeFolder('site', { 'index.html': '<p>a</p>' }))
    render(<EditorPageContainer {...data} />)

    await expect
      .element(page.getByRole('heading', { level: 1, name: strings.startScreen.productName }))
      .toBeVisible()
    await expect.element(button(strings.startScreen.openFolder)).toBeEnabled()
    await expect.element(button(strings.startScreen.openFile)).toBeEnabled()
    expect(page.getByText(strings.startScreen.unsupportedTitle).query()).toBeNull()
  })

  it('in a browser without the file pickers, tells to use Chrome or Edge and switches both buttons off', async () => {
    removePickers()
    render(<EditorPageContainer {...data} />)

    await expect
      .element(page.getByRole('status'))
      .toHaveTextContent(strings.startScreen.unsupportedTitle)
    await expect.element(button(strings.startScreen.openFolder)).toBeDisabled()
    await expect.element(button(strings.startScreen.openFile)).toBeDisabled()
  })

  it('hydrates the static HTML (written for supported browsers) without rebuilding the buttons', async () => {
    const host = document.createElement('div')
    host.innerHTML = renderToString(<EditorPageContainer {...data} />)
    document.body.append(host)
    onTestFinished(() => host.remove())
    const written = button(strings.startScreen.openFolder).element()

    render(<EditorPageContainer {...data} />, { container: host, hydrate: true })

    expect(
      button(strings.startScreen.openFolder).element(),
      'the same element after hydration'
    ).toBe(written)
    await expect.element(button(strings.startScreen.openFolder)).toBeEnabled()
  })
})
