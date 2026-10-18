// build-preview.tsのテスト
import { describe, expect, it } from 'vitest'
import { toDataUrl } from '@/utils/preview-data-url'
import {
  isSamePreview,
  previewDelayOf,
  previewEntryOf,
  previewFilesOf,
  previewSessionOf,
  previewSrcdocOf,
} from './build-preview'
import { undoDoc } from './doc-state'
import { binaryFile, sessionOf, textFile, typed } from './session.test-helper'
import type { Session, SessionFile, TextSessionFile } from './types'

const PNG = new Uint8Array([137, 80, 78, 71])

describe('previewEntryOf', () => {
  it('runs the file in the code editor when it is HTML', () => {
    expect(
      previewEntryOf(sessionOf([textFile('about.html'), textFile('index.html')], 'about.html'))
    ).toBe('about.html')
  })

  it('runs the start HTML while the code editor shows another kind of file', () => {
    const files = [textFile('b.html'), textFile('a.css'), textFile('a.html')]
    expect(previewEntryOf(sessionOf(files, 'a.css'))).toBe('a.html')
  })

  it('is the empty path when the project has no HTML text file', () => {
    expect(previewEntryOf(sessionOf([textFile('a.css'), binaryFile('b.html')], 'a.css'))).toBe('')
  })
})

describe('previewFilesOf', () => {
  it('gives the current text of text files (unsaved edits included) and the bytes of binary files', () => {
    const files = [typed(textFile('index.html', '<p>a</p>'), 'X'), binaryFile('a.png', PNG)]
    expect(previewFilesOf(sessionOf(files))).toStrictEqual([
      { path: 'index.html', content: '<p>a</p>X' },
      { path: 'a.png', content: PNG },
    ])
  })
})

describe('previewSrcdocOf', () => {
  it('is undefined when nothing is open', () => {
    expect(previewSrcdocOf(null)).toBeUndefined()
  })

  it('is undefined when there is no HTML to run', () => {
    expect(previewSrcdocOf(sessionOf([textFile('a.css')]))).toBeUndefined()
  })

  it('builds the srcdoc of the entry with the references of the folder put in', () => {
    const files = [textFile('index.html', '<img src="a.png">'), binaryFile('a.png', PNG)]
    expect(previewSrcdocOf(sessionOf(files))).toBe(`<img src="${toDataUrl(PNG, 'image/png')}">`)
  })
})

describe('previewSessionOf', () => {
  const current = sessionOf([textFile('index.html')])
  const settled = { ...current, files: [] }

  it('shows the settled session while it belongs to the same opening as the current one', () => {
    expect(previewSessionOf(settled, current)).toBe(settled)
  })

  it('shows the current session at once after another opening', () => {
    expect(previewSessionOf(sessionOf([textFile('index.html')]), current)).toBe(current)
  })

  it('shows the current session when nothing was settled yet', () => {
    expect(previewSessionOf(null, current)).toBe(current)
  })

  it('shows nothing at once after closing', () => {
    expect(previewSessionOf(settled, null)).toBeNull()
  })
})

describe('isSamePreview', () => {
  const html = textFile('index.html', '<p>a</p>')
  const png = binaryFile('a.png', PNG)
  const base = sessionOf([html, png])
  // filesを置き換えた、同じ開き方のセッション
  const withFiles = (files: SessionFile[]): Session => ({ ...base, files })
  const moved: TextSessionFile = {
    ...html,
    doc: html.doc.update({ selection: { anchor: 1 } }).state,
  }

  it('is true when nothing is open in both', () => {
    expect(isSamePreview(null, null)).toBe(true)
  })

  it.each([
    ['before', null, base],
    ['after', base, null],
  ])('is false when nothing is open only %s', (_, a, b) => {
    expect(isSamePreview(a, b)).toBe(false)
  })

  it('is true for a new state with the same text (a cursor move, the parser catching up)', () => {
    expect(isSamePreview(base, withFiles([moved, png]))).toBe(true)
  })

  it('is true for the same text in another document (typed and undone)', () => {
    const undone: TextSessionFile = { ...html, doc: undoDoc(typed(html, 'X').doc) }
    expect(isSamePreview(base, withFiles([undone, png]))).toBe(true)
  })

  it('is false when the text of a file changed', () => {
    expect(isSamePreview(base, withFiles([typed(html, 'X'), png]))).toBe(false)
  })

  it('is false for another opening, also with the same files', () => {
    expect(isSamePreview(base, sessionOf(base.files))).toBe(false)
  })

  it('is false when another HTML file runs, and true while the code editor only shows another kind', () => {
    const site = sessionOf(
      [textFile('about.html'), textFile('index.html'), textFile('a.css')],
      'index.html'
    )
    expect(isSamePreview(site, { ...site, activePath: 'about.html' })).toBe(false)
    expect(isSamePreview(site, { ...site, activePath: 'a.css' })).toBe(true)
  })

  it('compares a binary file by the file itself', () => {
    expect(isSamePreview(base, withFiles([html, binaryFile('a.png', PNG)]))).toBe(false)
  })

  it.each([
    ['a text file where a binary file was', [html, textFile('a.png')]],
    ['a binary file where a text file was', [binaryFile('index.html'), png]],
    ['a file more', [html, png, textFile('b.css')]],
  ])('is false with %s', (_, files) => {
    expect(isSamePreview(base, withFiles(files))).toBe(false)
  })
})

describe('previewDelayOf', () => {
  const current = sessionOf([textFile('index.html', '<p>a</p>')])
  const edited = { ...current, files: [typed(textFile('index.html', '<p>a</p>'), 'X')] }

  it('is null when there is nothing to build: the same preview, or nothing open in both', () => {
    expect(previewDelayOf(current, { ...current })).toBeNull()
    expect(previewDelayOf(null, null)).toBeNull()
  })

  it('waits 300 ms after an edit within one opening', () => {
    expect(previewDelayOf(current, edited)).toBe(300)
  })

  it.each([
    ['a project was opened', null, current],
    ['another project was opened', sessionOf(current.files), current],
    ['the project was closed', current, null],
  ])('settles at once when %s', (_, settled, next) => {
    expect(previewDelayOf(settled, next)).toBe(0)
  })
})
