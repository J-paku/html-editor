// 本物のChromiumでプロジェクトを開く。選ぶ窓が渡すフォルダかファイル1つ(OPFSで代わりをする)、最初に出すファイル、
// ファイルの切り替え、開くのをやめたときや失敗したときに利用者に見えるもの
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import EditorPageContainer from '@/components/EditorPage/container'
import {
  button,
  codeBox,
  data,
  fileAt,
  fileRow,
  makeFolder,
  notice,
  openFolderFromStart,
  removeAt,
  resetStorage,
  stubFilePicker,
  stubFolderPicker,
  stubPickerFailure,
  strings,
} from './editor-page.test-helper'

const PNG = new Uint8Array([137, 80, 78, 71])

beforeEach(resetStorage)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const projectHeading = (name: string) => page.getByRole('heading', { level: 1, name, exact: true })

describe('opening a folder', () => {
  it('lists every file, shows index.html in the code editor, and keeps binary files out of editing', async () => {
    stubFolderPicker(
      await makeFolder('site', {
        'about.html': '<p>about</p>',
        'index.html': '<h1>top</h1>',
        css: { 'site.css': 'h1 { margin: 0 }' },
        img: { 'logo.png': PNG },
      })
    )
    render(<EditorPageContainer {...data} />)

    await openFolderFromStart()

    await expect.element(projectHeading('site')).toBeVisible()
    await expect.element(codeBox()).toHaveTextContent(/^<h1>top<\/h1>$/)
    for (const path of ['about.html', 'index.html', 'css/site.css']) {
      await expect.element(fileRow(path)).toBeEnabled()
    }
    await expect.element(fileRow('img/logo.png')).toBeDisabled()
    await expect.element(fileRow('index.html')).toHaveAttribute('aria-current', 'page')
  })

  it('without index.html, shows the first HTML file in path order', async () => {
    stubFolderPicker(
      await makeFolder('pages', { 'b.html': '<p>b</p>', 'a.html': '<p>a</p>', 'notes.txt': 'n' })
    )
    render(<EditorPageContainer {...data} />)

    await openFolderFromStart()

    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>$/)
  })

  it('switches the code editor to the file chosen in the list', async () => {
    stubFolderPicker(
      await makeFolder('site', { 'index.html': '<p>a</p>', 'site.css': 'p { color: red }' })
    )
    render(<EditorPageContainer {...data} />)
    await openFolderFromStart()

    await userEvent.click(fileRow('site.css'))

    await expect.element(codeBox()).toHaveTextContent(/^p \{ color: red \}$/)
    await expect.element(fileRow('site.css')).toHaveAttribute('aria-current', 'page')
    await expect.element(fileRow('index.html')).not.toHaveAttribute('aria-current')
  })
})

describe('opening one file', () => {
  it('shows the picked file under its name', async () => {
    const folder = await makeFolder('downloads', { 'slides.html': '<section>1</section>' })
    stubFilePicker(await fileAt(folder, 'slides.html'))
    render(<EditorPageContainer {...data} />)

    await userEvent.click(button(strings.startScreen.openFile))

    await expect.element(projectHeading('slides.html')).toBeVisible()
    await expect.element(codeBox()).toHaveTextContent(/^<section>1<\/section>$/)
  })
})

describe('when opening does not go through', () => {
  it('stays silent when the picker is closed without choosing', async () => {
    stubPickerFailure(new DOMException('The user aborted a request.', 'AbortError'))
    render(<EditorPageContainer {...data} />)
    await userEvent.click(button(strings.startScreen.openFolder))

    // その後も開けて、閉じた選ぶ窓が知らせを残していない
    stubFolderPicker(await makeFolder('site', { 'index.html': '<p>a</p>' }))
    await openFolderFromStart()
    expect(notice().query()).toBeNull()
  })

  it('tells that it could not open when the picker fails, and the message can be closed', async () => {
    stubPickerFailure(new DOMException('Not allowed.', 'SecurityError'))
    render(<EditorPageContainer {...data} />)

    await userEvent.click(button(strings.startScreen.openFile))

    await expect.element(notice()).toHaveTextContent(strings.notice.messages.openFailed)
    await expect.element(button(strings.startScreen.openFolder)).toBeVisible()
    await userEvent.click(button(strings.notice.dismiss))
    expect(notice().query()).toBeNull()
  })

  it('tells that it could not open when the folder cannot be read (removed after picking)', async () => {
    const folder = await makeFolder('gone', { 'index.html': '<p>a</p>' })
    await removeAt(await navigator.storage.getDirectory(), 'gone')
    stubFolderPicker(folder)
    render(<EditorPageContainer {...data} />)

    await userEvent.click(button(strings.startScreen.openFolder))

    await expect.element(notice()).toHaveTextContent(strings.notice.messages.openFailed)
    expect(codeBox().query()).toBeNull()
  })

  it('tells that there is nothing to edit in a folder without text files, and stays on the start screen', async () => {
    stubFolderPicker(await makeFolder('photos', { 'a.png': PNG }))
    render(<EditorPageContainer {...data} />)

    await userEvent.click(button(strings.startScreen.openFolder))

    await expect.element(notice()).toHaveTextContent(strings.notice.messages.noTextFile)
    await expect.element(button(strings.startScreen.openFolder)).toBeVisible()
  })
})
