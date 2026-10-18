// load-file.tsのテスト
import { describe, expect, it } from 'vitest'
import { fakeFile } from '@/lib/fake-file-system.test-helper'
import type { ProjectFile } from '@/lib/read-project'
import { docText, isDirty } from './doc-state'
import { toSessionFile, toTextSessionFile } from './load-file'
import { FINGERPRINT } from './session.test-helper'

const handle = fakeFile('a')

const textRead = (path: string, text: string): ProjectFile => ({
  path,
  kind: 'text',
  text,
  fingerprint: FINGERPRINT,
  handle,
})

const binaryRead = (path: string, bytes: Uint8Array<ArrayBuffer>): ProjectFile => ({
  path,
  kind: 'binary',
  blob: new Blob([bytes]),
  fingerprint: FINGERPRINT,
  handle,
})

describe('toTextSessionFile', () => {
  it('gives a text file a fresh document of its text, saved as it is, keeping its path, fingerprint and handle', () => {
    const file = toTextSessionFile(textRead('css/site.css', 'a {}\r\n'))

    expect(file).toStrictEqual({
      kind: 'text',
      path: 'css/site.css',
      doc: file.doc,
      savedDoc: file.doc.doc,
      fingerprint: FINGERPRINT,
      handle,
    })
    expect(docText(file.doc)).toBe('a {}\r\n')
    expect(isDirty(file.doc, file.savedDoc)).toBe(false)
  })

  it('throws, naming the path, when the file is no longer text', () => {
    expect(() => toTextSessionFile(binaryRead('index.html', new Uint8Array([0xc3])))).toThrow(
      new TypeError('index.html is no longer a text file')
    )
  })
})

describe('toSessionFile', () => {
  it('gives a text file its document', async () => {
    const file = await toSessionFile(textRead('index.html', '<p>a</p>'))

    expect(file.kind).toBe('text')
    expect(file.kind === 'text' && docText(file.doc)).toBe('<p>a</p>')
  })

  it('reads the bytes of a binary file, keeping its path, fingerprint and handle', async () => {
    const file = await toSessionFile(binaryRead('img/a.png', new Uint8Array([137, 80, 78, 71])))

    expect(file).toStrictEqual({
      kind: 'binary',
      path: 'img/a.png',
      bytes: new Uint8Array([137, 80, 78, 71]),
      fingerprint: FINGERPRINT,
      handle,
    })
  })
})
