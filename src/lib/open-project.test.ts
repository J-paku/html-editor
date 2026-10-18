// ピッカーでフォルダか1つのファイルを開くことと、ブラウザにピッカーがあるかを見分けること
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeDirectory, fakeFile } from './fake-file-system.test-helper'
import { isFileAccessSupported, openFolder, openSingleFile } from './open-project'

const aborted = () => new DOMException('The user aborted a request.', 'AbortError')

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isFileAccessSupported', () => {
  it('without the pickers (node, Firefox, Safari) → false', () => {
    expect(isFileAccessSupported()).toBe(false)
  })

  it('with only one of the two pickers → false', () => {
    vi.stubGlobal('showDirectoryPicker', vi.fn())
    expect(isFileAccessSupported()).toBe(false)

    vi.unstubAllGlobals()
    vi.stubGlobal('showOpenFilePicker', vi.fn())
    expect(isFileAccessSupported()).toBe(false)
  })

  it('with both pickers → true', () => {
    vi.stubGlobal('showDirectoryPicker', vi.fn())
    vi.stubGlobal('showOpenFilePicker', vi.fn())

    expect(isFileAccessSupported()).toBe(true)
  })

  it('a member with the name that is not a function → false', () => {
    vi.stubGlobal('showDirectoryPicker', {})
    vi.stubGlobal('showOpenFilePicker', vi.fn())

    expect(isFileAccessSupported()).toBe(false)
  })
})

describe('openFolder', () => {
  it('returns the picked folder, asking for write access under the remembered id', async () => {
    const directory = fakeDirectory('slides')
    const picker = vi.fn().mockResolvedValue(directory)
    vi.stubGlobal('showDirectoryPicker', picker)

    expect(await openFolder()).toEqual({ kind: 'folder', name: 'slides', directory })
    expect(picker).toHaveBeenCalledWith({ id: 'html-editor', mode: 'readwrite' })
  })

  it('the picker closed without choosing → null', async () => {
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockRejectedValue(aborted()))

    expect(await openFolder()).toBeNull()
  })

  it('any other failure reaches the caller as it is', async () => {
    const error = new DOMException('Must be handling a user gesture', 'SecurityError')
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockRejectedValue(error))

    await expect(openFolder()).rejects.toBe(error)
  })
})

describe('openSingleFile', () => {
  it('returns the picked file, offering HTML files under the remembered id', async () => {
    const file = fakeFile('deck.html', '<h1>deck</h1>')
    const picker = vi.fn().mockResolvedValue([file])
    vi.stubGlobal('showOpenFilePicker', picker)

    expect(await openSingleFile()).toEqual({ kind: 'file', name: 'deck.html', file })
    expect(picker).toHaveBeenCalledWith({
      id: 'html-editor',
      types: [{ accept: { 'text/html': ['.html', '.htm'] } }],
    })
  })

  it('the picker closed without choosing → null', async () => {
    vi.stubGlobal('showOpenFilePicker', vi.fn().mockRejectedValue(aborted()))

    expect(await openSingleFile()).toBeNull()
  })

  it('any other failure reaches the caller as it is', async () => {
    const error = new DOMException('Must be handling a user gesture', 'SecurityError')
    vi.stubGlobal('showOpenFilePicker', vi.fn().mockRejectedValue(error))

    await expect(openSingleFile()).rejects.toBe(error)
  })
})
