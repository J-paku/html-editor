// ファイルの中身を置き換えることと、開いたフォルダの下に新しいファイルを作ること
import { describe, expect, it, vi } from 'vitest'
import { FAKE_MODIFIED, fakeDirectory, fakeFile, textAt } from './fake-file-system.test-helper'
import { createFileAt, writeFileContent } from './write-file'

// writableが1つの段で失敗するファイル。写しを捨てるのも失敗するかはabortResultで決める
const failingFile = (step: 'write' | 'close', error: Error, abortResult = Promise.resolve()) => {
  const handle = fakeFile('a.html', 'original')
  const abort = vi.fn(() => abortResult)
  const failing = {
    ...handle,
    createWritable: async () => {
      const writable = await handle.createWritable()
      return {
        write: step === 'write' ? () => Promise.reject(error) : writable.write,
        close: step === 'close' ? () => Promise.reject(error) : writable.close,
        abort,
      } as Partial<FileSystemWritableFileStream> as FileSystemWritableFileStream
    },
  }
  return { handle: failing, abort }
}

describe('writeFileContent', () => {
  it('replaces the content with the text and returns the fingerprint the file has afterwards', async () => {
    const handle = fakeFile('a.html', 'old content')

    const fingerprint = await writeFileContent(handle, '<h1>new</h1>')

    expect(await (await handle.getFile()).text()).toBe('<h1>new</h1>')
    expect(fingerprint).toStrictEqual({ lastModified: FAKE_MODIFIED + 1, size: 12 })
  })

  it('writes a Blob as its bytes', async () => {
    const handle = fakeFile('logo.png')

    await writeFileContent(handle, new Blob([new Uint8Array([1, 2, 3])]))

    expect([...new Uint8Array(await (await handle.getFile()).arrayBuffer())]).toEqual([1, 2, 3])
  })

  it.each(['write', 'close'] as const)(
    'when %s fails, the copy is thrown away, the file stays as it was, and the error reaches the caller',
    async step => {
      const error = new DOMException('disk full', 'QuotaExceededError')
      const { handle, abort } = failingFile(step, error)

      await expect(writeFileContent(handle, 'new')).rejects.toBe(error)
      expect(abort).toHaveBeenCalledOnce()
      expect(await (await handle.getFile()).text()).toBe('original')
    }
  )

  it('when throwing the copy away fails too, the caller still gets the write error', async () => {
    const error = new DOMException('disk full', 'QuotaExceededError')
    const { handle, abort } = failingFile('write', error, Promise.reject(new TypeError('errored')))

    await expect(writeFileContent(handle, 'new')).rejects.toBe(error)
    expect(abort).toHaveBeenCalledOnce()
  })
})

describe('createFileAt', () => {
  it('creates the file and the folders on the way that do not exist yet', async () => {
    const directory = fakeDirectory('slides', { 'index.html': '<h1>hi</h1>' })

    const created = await createFileAt(directory, 'img/new/photo.svg', '<svg/>')

    expect(await textAt(directory, 'img/new/photo.svg')).toBe('<svg/>')
    expect(created?.handle.name).toBe('photo.svg')
    expect(created?.fingerprint).toStrictEqual({ lastModified: FAKE_MODIFIED + 1, size: 6 })
  })

  it('uses a folder that exists, leaving the files in it alone', async () => {
    const directory = fakeDirectory('slides', { css: { 'style.css': 'h1 {}' } })

    await createFileAt(directory, 'css/print.css', '@media print {}')

    expect(await textAt(directory, 'css/style.css')).toBe('h1 {}')
    expect(await textAt(directory, 'css/print.css')).toBe('@media print {}')
  })

  it('creates a file at the top of the folder', async () => {
    const directory = fakeDirectory('slides')

    await createFileAt(directory, 'notes.txt', new Blob(['memo']))

    expect(await textAt(directory, 'notes.txt')).toBe('memo')
  })

  it('normalizes the path first', async () => {
    const directory = fakeDirectory('slides')

    await createFileAt(directory, './img/../logo.svg', '<svg/>')

    expect(await textAt(directory, 'logo.svg')).toBe('<svg/>')
  })

  it('a file that exists already → null, and it is not overwritten', async () => {
    const directory = fakeDirectory('slides', { img: { 'logo.svg': 'original' } })

    expect(await createFileAt(directory, 'img/logo.svg', 'new')).toBeNull()
    expect(await textAt(directory, 'img/logo.svg')).toBe('original')
  })

  it('a folder with the name of the file reaches the caller as an error', async () => {
    const directory = fakeDirectory('slides', { img: {} })

    await expect(createFileAt(directory, 'img', 'x')).rejects.toMatchObject({
      name: 'TypeMismatchError',
    })
  })

  it('when looking for an existing file fails for another reason, nothing is created', async () => {
    // 失敗するのは探すことだけ(たとえば許可が落ちたとき)。作ることは成功するので、この失敗を
    // 「そこにファイルが無い」と読んではいけない
    const error = new DOMException('denied', 'NotAllowedError')
    const directory = fakeDirectory('slides')
    const create = vi.fn(directory.getFileHandle)
    const guarded = {
      ...directory,
      getFileHandle: (name: string, options?: FileSystemGetFileOptions) =>
        options?.create === true ? create(name, options) : Promise.reject(error),
    }

    await expect(createFileAt(guarded, 'notes.txt', 'memo')).rejects.toBe(error)
    expect(create).not.toHaveBeenCalled()
  })

  it.each(['', '/', 'img/..', '../outside.svg'])(
    '%j names no file inside the folder → RangeError',
    async path => {
      await expect(createFileAt(fakeDirectory('slides'), path, 'x')).rejects.toThrow(
        new RangeError(`not a file path inside the folder: ${path}`)
      )
    }
  )
})
