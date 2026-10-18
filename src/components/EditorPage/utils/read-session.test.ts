// read-session.tsのテスト
import { describe, expect, it } from 'vitest'
import { restoreDoc } from './doc-state'
import {
  activeFileOf,
  baseFingerprintOf,
  fileListItemsOf,
  isSessionDirty,
  textFileOf,
} from './read-session'
import { FINGERPRINT, binaryFile, sessionOf, textFile, typed } from './session.test-helper'

const html = textFile('index.html')
const css = textFile('site.css')
const png = binaryFile('a.png')

describe('textFileOf', () => {
  it('finds the text file at path', () => {
    expect(textFileOf(sessionOf([html, css]), 'site.css')).toBe(css)
  })

  it.each([
    ['a path the session does not have', 'missing.css'],
    ['the path of a binary file', 'a.png'],
  ])('throws, naming the path, for %s', (_, path) => {
    expect(() => textFileOf(sessionOf([html, png]), path)).toThrow(
      new RangeError(`no text file at ${path}`)
    )
  })
})

describe('activeFileOf', () => {
  it('is the text file at the active path', () => {
    expect(activeFileOf(sessionOf([html, css], 'site.css'))).toBe(css)
  })
})

describe('isSessionDirty', () => {
  it('is false when nothing is open', () => {
    expect(isSessionDirty(null)).toBe(false)
  })

  it('is false while every text file has its saved text', () => {
    expect(isSessionDirty(sessionOf([html, png, css]))).toBe(false)
  })

  it('is true when some text file differs from its saved text', () => {
    expect(isSessionDirty(sessionOf([html, png, typed(css, 'x')]))).toBe(true)
  })
})

describe('fileListItemsOf', () => {
  it('gives one row per file in order: whether it is text and whether it is unsaved', () => {
    expect(fileListItemsOf(sessionOf([typed(html, 'x'), png, css]))).toStrictEqual([
      { path: 'index.html', isText: true, hasUnsavedChanges: true },
      { path: 'a.png', isText: false, hasUnsavedChanges: false },
      { path: 'site.css', isText: true, hasUnsavedChanges: false },
    ])
  })
})

describe('baseFingerprintOf', () => {
  const DRAFT = { lastModified: 1, size: 2 }
  const SAVED = { lastModified: 3000, size: 12 }
  // DRAFTから作った下書きを、読んだときの版(FINGERPRINT)の上に復元したファイル
  const restored = {
    ...html,
    doc: restoreDoc(html.doc, '<p>kept</p>', { draft: DRAFT, disk: FINGERPRINT }),
  }

  it('is the fingerprint of the file while its text holds no restored draft', () => {
    expect(baseFingerprintOf(typed(html, 'x'))).toBe(FINGERPRINT)
  })

  it('is the version the draft was made from while the text holds a draft restored on top of the file read', () => {
    expect(baseFingerprintOf(restored)).toBe(DRAFT)
  })

  it('is the fingerprint of the file once it was written after the restore', () => {
    expect(baseFingerprintOf({ ...restored, fingerprint: SAVED })).toBe(SAVED)
  })
})
