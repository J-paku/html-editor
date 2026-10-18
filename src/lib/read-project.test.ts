// 開いたフォルダかファイルの全部のファイルを読むことと、ディスクのファイルの今の指紋を読むこと
import { describe, expect, it } from 'vitest'
import { FAKE_MODIFIED, fakeDirectory, fakeFile, fileAt } from './fake-file-system.test-helper'
import { readFingerprint, readProjectFile, readProjectFiles } from './read-project'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
// Shift_JISの「あ」。正しいUTF-8ではない
const SHIFT_JIS = new Uint8Array([0x82, 0xa0])

// わざと順番をばらばらに並べる。結果はパスの順に並ぶ
const site = () =>
  fakeDirectory('slides', {
    'index.html': '<h1>hi</h1>',
    img: { 'logo.png': PNG },
    '.git': { HEAD: 'ref: refs/heads/main' },
    node_modules: { lib: { 'index.js': 'export {}' } },
    '.cache': { 'a.txt': 'cached' },
    '.env': 'A=1',
    nested: { deep: { 'page.htm': '<p>deep</p>' } },
    css: { 'style.css': 'h1 { color: red }' },
    'sjis.html': SHIFT_JIS,
  })

const bytesOf = async (blob: Blob) => [...new Uint8Array(await blob.arrayBuffer())]

describe('readProjectFiles (a folder)', () => {
  it('reads every file under the folder, sorted by path, skipping dot folders and node_modules', async () => {
    const directory = site()

    const files = await readProjectFiles({ kind: 'folder', name: 'slides', directory })

    expect(files.map(file => [file.path, file.kind])).toEqual([
      ['.env', 'binary'],
      ['css/style.css', 'text'],
      ['img/logo.png', 'binary'],
      ['index.html', 'text'],
      ['nested/deep/page.htm', 'text'],
      ['sjis.html', 'binary'],
    ])
  })

  it('a text file comes with its text, a binary file with its bytes untouched', async () => {
    const directory = site()

    const files = await readProjectFiles({ kind: 'folder', name: 'slides', directory })
    const byPath = new Map(files.map(file => [file.path, file]))

    expect(byPath.get('css/style.css')).toMatchObject({ text: 'h1 { color: red }' })
    expect(byPath.get('nested/deep/page.htm')).toMatchObject({ text: '<p>deep</p>' })
    const logo = byPath.get('img/logo.png')
    expect(logo?.kind === 'binary' && (await bytesOf(logo.blob))).toEqual([...PNG])
    // UTF-8でないページはバイトのまま持つので、保存して壊すことが無い
    const sjis = byPath.get('sjis.html')
    expect(sjis?.kind === 'binary' && (await bytesOf(sjis.blob))).toEqual([...SHIFT_JIS])
  })

  it('each file comes with its fingerprint and the handle saving writes to', async () => {
    const directory = site()

    const files = await readProjectFiles({ kind: 'folder', name: 'slides', directory })
    const index = files.find(file => file.path === 'index.html')

    expect(index?.fingerprint).toStrictEqual({ lastModified: FAKE_MODIFIED, size: 11 })
    expect(index?.handle).toBe(await fileAt(directory, 'index.html'))
    const logo = files.find(file => file.path === 'img/logo.png')
    expect(logo?.handle).toBe(await fileAt(directory, 'img/logo.png'))
  })

  it('an empty folder has no files', async () => {
    expect(
      await readProjectFiles({ kind: 'folder', name: 'empty', directory: fakeDirectory('empty') })
    ).toEqual([])
  })
})

describe('readProjectFiles (one file)', () => {
  it('reads the one file, its path being its name', async () => {
    const file = fakeFile('deck.html', '<h1>deck</h1>', 5000)

    const files = await readProjectFiles({ kind: 'file', name: 'deck.html', file })

    expect(files).toEqual([
      {
        path: 'deck.html',
        kind: 'text',
        text: '<h1>deck</h1>',
        fingerprint: { lastModified: 5000, size: 13 },
        handle: file,
      },
    ])
  })
})

describe('readProjectFile', () => {
  it('reads a file under the given path, keeping a byte order mark in the text', async () => {
    const handle = fakeFile('a.html', new Uint8Array([0xef, 0xbb, 0xbf, 0x61]))

    expect(await readProjectFile(handle, 'pages/a.html')).toEqual({
      path: 'pages/a.html',
      kind: 'text',
      text: '﻿a',
      fingerprint: { lastModified: FAKE_MODIFIED, size: 4 },
      handle,
    })
  })

  it('the kind follows the path given, not the handle name', async () => {
    const handle = fakeFile('a.html', 'text')

    expect(await readProjectFile(handle, 'a.bin')).toMatchObject({ kind: 'binary' })
  })
})

describe('readFingerprint', () => {
  it('the file on disk now', async () => {
    expect(await readFingerprint(fakeFile('a.html', 'abc', 42))).toStrictEqual({
      lastModified: 42,
      size: 3,
    })
  })

  it('a file that no longer exists → null', async () => {
    const handle = {
      ...fakeFile('a.html'),
      getFile: () => Promise.reject(new DOMException('gone', 'NotFoundError')),
    }

    expect(await readFingerprint(handle)).toBeNull()
  })

  it('any other failure reaches the caller as it is', async () => {
    const error = new DOMException('denied', 'NotAllowedError')
    const handle = { ...fakeFile('a.html'), getFile: () => Promise.reject(error) }

    await expect(readFingerprint(handle)).rejects.toBe(error)
  })
})
