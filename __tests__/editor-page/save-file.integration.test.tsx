// 本物のChromiumでの保存。ファイルに書いた文字(OPFSで確かめる)は、利用者が変えなかったバイトを1つ残らず保ち、
// 保存していない印が消え、下書きが消え、書く許可を断られたら利用者に知らせる
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import EditorPageContainer from '@/components/EditorPage/container'
import {
  button,
  codeBox,
  data,
  draftTexts,
  fileAt,
  makeFolder,
  notice,
  openFolderFromStart,
  resetStorage,
  stubFilePicker,
  stubFolderPicker,
  strings,
  textAt,
  typeAtEnd,
  unsavedMark,
} from './editor-page.test-helper'

beforeEach(resetStorage)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const saveButton = () => button(strings.toolbar.save)

describe('saving', () => {
  it('writes the edit into the file and keeps the BOM and the CRLF line breaks it did not touch', async () => {
    const original = '﻿<p>a</p>\r\n<p>b</p>\r\n'
    const folder = await makeFolder('site', { 'index.html': original })
    stubFolderPicker(folder)
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()

    // 1行目の終わりに
    await codeBox().click()
    await userEvent.keyboard('{Control>}{Home}{/Control}{End}X')
    await userEvent.click(saveButton())

    await expect.poll(() => textAt(folder, 'index.html')).toBe('﻿<p>a</p>X\r\n<p>b</p>\r\n')
    await expect.element(saveButton()).toBeDisabled()
    expect(unsavedMark().query()).toBeNull()
  })

  it('saves again after more typing, taking the written file as the new version on disk', async () => {
    const folder = await makeFolder('site', { 'index.html': '<p>a</p>' })
    stubFolderPicker(folder)
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()
    await typeAtEnd('X')
    await userEvent.click(saveButton())
    await expect.poll(() => textAt(folder, 'index.html')).toBe('<p>a</p>X')

    await typeAtEnd('Y')
    await userEvent.click(saveButton())

    await expect.poll(() => textAt(folder, 'index.html')).toBe('<p>a</p>XY')
    expect(notice().query()).toBeNull()
  })

  it('leaves the code editor as it is drawn, so what is being typed (an IME composition too) is not disturbed', async () => {
    const folder = await makeFolder('site', { 'index.html': '<p>a</p>' })
    stubFolderPicker(folder)
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()
    await typeAtEnd('X')
    // コード窓が描いた行。コード窓の状態を差し替えると、全部の行を描き直す
    const line = codeBox().element().firstElementChild

    await userEvent.click(saveButton())
    await expect.poll(() => textAt(folder, 'index.html')).toBe('<p>a</p>X')
    await expect.element(saveButton()).toBeDisabled()

    expect(line?.isConnected).toBe(true)
  })

  it('drops the draft of the saved file', async () => {
    const folder = await makeFolder('site', { 'index.html': '<p>a</p>' })
    stubFolderPicker(folder)
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()
    await typeAtEnd('X')
    await expect.poll(() => draftTexts('folder:site')).toEqual({ 'index.html': '<p>a</p>X' })

    await userEvent.click(saveButton())

    await expect.poll(() => draftTexts('folder:site')).toEqual({})
  })

  it('tells the user when write permission is refused, and leaves the file and the edit as they were', async () => {
    const folder = await makeFolder('downloads', { 'page.html': '<p>a</p>' })
    // 選ぶ窓は、ブラウザが書く許可を持たないファイルを渡し、利用者は確認を断る
    const file = Object.assign(await fileAt(folder, 'page.html'), {
      queryPermission: async () => 'prompt',
      requestPermission: async () => 'denied',
    })
    stubFilePicker(file)
    render(<EditorPageContainer {...data} />)
    await userEvent.click(button(strings.startScreen.openFile))
    await expect.element(codeBox()).toBeVisible()
    await typeAtEnd('X')

    await userEvent.click(saveButton())

    await expect.element(notice()).toHaveTextContent(strings.notice.messages.permissionDenied)
    expect(await textAt(folder, 'page.html')).toBe('<p>a</p>')
    await expect.element(unsavedMark()).toBeVisible()
    await expect.element(saveButton()).toBeEnabled()
  })
})
