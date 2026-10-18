// plan-drafts.tsのテスト
import { describe, expect, it } from 'vitest'
import { restoreDoc, savedDocOf, undoDoc } from './doc-state'
import {
  changedDraftsOf,
  draftWritesOf,
  isLeavingSight,
  pendingAfterWrites,
  pendingWithChanges,
  writablePending,
} from './plan-drafts'
import { FINGERPRINT, binaryFile, sessionOf, textFile, typed } from './session.test-helper'
import type { Session, TextSessionFile } from './types'

const html = textFile('index.html', '<p>a</p>')
const css = textFile('site.css', 'a {}')
const png = binaryFile('site.png')
const base = sessionOf([html, png, css])

// filesを置き換えた、同じ開き方のセッション
const withFiles = (session: Session, files: Session['files']): Session => ({ ...session, files })

describe('changedDraftsOf', () => {
  it('lists the text files whose text changed within the same opening', () => {
    const next = withFiles(base, [typed(html, 'X'), png, css])
    expect(changedDraftsOf(base, next)).toStrictEqual([{ openId: base.openId, path: 'index.html' }])
  })

  it('does not count a new state with the same text (a cursor move or a selection)', () => {
    const moved: TextSessionFile = {
      ...css,
      doc: css.doc.update({ selection: { anchor: 1 } }).state,
    }
    const selected: TextSessionFile = {
      ...html,
      doc: html.doc.update({ selection: { anchor: 0, head: 3 } }).state,
    }
    expect(changedDraftsOf(base, withFiles(base, [selected, png, moved]))).toStrictEqual([])
  })

  it('counts a save (the saved text changed, the text did not), so a draft written before it is dropped after', () => {
    const saved: TextSessionFile = { ...html, savedDoc: savedDocOf(html.doc, '<p>a</p>') }
    expect(changedDraftsOf(base, withFiles(base, [saved, png, css]))).toStrictEqual([
      { openId: base.openId, path: 'index.html' },
    ])
  })

  it('counts a text file the previous session did not have', () => {
    const next = withFiles(base, [html, png, css, textFile('new.css')])
    expect(changedDraftsOf(base, next)).toStrictEqual([{ openId: base.openId, path: 'new.css' }])
  })

  it.each([
    ['a fresh opening (also of the same project)', base, sessionOf([typed(html, 'X'), png, css])],
    ['nothing open before', null, base],
    ['closing', base, null],
  ])('is empty for %s', (_, previous, next) => {
    expect(changedDraftsOf(previous, next)).toStrictEqual([])
  })
})

describe('pendingWithChanges', () => {
  const entry = (path: string, openId = base.openId) => ({ openId, path })

  it('holds one entry per file: a file changed again replaces its entry with the new one', () => {
    const first = entry('index.html')
    const other = entry('site.css')
    const again = entry('index.html')
    const pending = pendingWithChanges([first, other], [again], base.openId)
    expect(pending).toStrictEqual([other, again])
    expect(pending[1]).toBe(again)
  })

  it('does not grow while the same file keeps changing', () => {
    let pending = pendingWithChanges([], [entry('index.html')], base.openId)
    for (let step = 0; step < 5; step += 1) {
      pending = pendingWithChanges(pending, [entry('index.html')], base.openId)
    }
    expect(pending).toHaveLength(1)
  })

  it('keeps the entries when nothing changed', () => {
    const waiting = [entry('index.html')]
    expect(pendingWithChanges(waiting, [], base.openId)).toStrictEqual(waiting)
  })

  it('drops the entries of another opening, and everything when nothing is open', () => {
    const old = entry('index.html', Symbol('closed opening'))
    expect(pendingWithChanges([old], [entry('site.css')], base.openId)).toStrictEqual([
      entry('site.css'),
    ])
    expect(pendingWithChanges([entry('index.html')], [], null)).toStrictEqual([])
  })
})

describe('writablePending', () => {
  it('leaves out the entries of held files', () => {
    const page = { openId: base.openId, path: 'index.html' }
    const style = { openId: base.openId, path: 'site.css' }
    expect(writablePending([page, style], new Set(['index.html']))).toStrictEqual([style])
    expect(writablePending([page, style], new Set())).toStrictEqual([page, style])
  })
})

describe('pendingAfterWrites', () => {
  it('keeps only the entries added while the writes went on, also for a file that was written', () => {
    const written = [
      { openId: base.openId, path: 'index.html' },
      { openId: base.openId, path: 'site.css' },
    ]
    const editedAgain = { openId: base.openId, path: 'index.html' }
    expect(pendingAfterWrites([...written, editedAgain], written)).toStrictEqual([editedAgain])
  })
})

describe('isLeavingSight', () => {
  it.each<[string, DocumentVisibilityState, boolean]>([
    ['pagehide', 'visible', true],
    ['pagehide', 'hidden', true],
    ['visibilitychange', 'hidden', true],
    ['visibilitychange', 'visible', false],
  ])('gives for %s while the page is %s: %s', (type, visibility, expected) => {
    expect(isLeavingSight(type, visibility)).toBe(expected)
  })
})

describe('draftWritesOf', () => {
  const pendingOf = (session: Session, ...paths: string[]) =>
    paths.map(path => ({ openId: session.openId, path }))

  it('keeps the text of a pending file that still differs from what was saved', () => {
    const fingerprint = { lastModified: 5, size: 6 }
    const session = withFiles(base, [{ ...typed(html, 'X'), fingerprint }, png, css])
    expect(draftWritesOf(session, pendingOf(session, 'index.html'))).toStrictEqual([
      {
        kind: 'save',
        draft: {
          projectKey: 'folder:site',
          path: 'index.html',
          openedFingerprint: fingerprint,
          text: '<p>a</p>X',
        },
      },
    ])
  })

  it('drops the draft of a pending file that went back to what was saved', () => {
    const undone: TextSessionFile = { ...html, doc: undoDoc(typed(html, 'X').doc) }
    const session = withFiles(base, [undone, png, css])
    expect(draftWritesOf(session, pendingOf(session, 'index.html'))).toStrictEqual([
      { kind: 'delete', projectKey: 'folder:site', path: 'index.html' },
    ])
  })

  it('writes each pending file once, in the order of the session, and nothing else', () => {
    const session = withFiles(base, [typed(html, 'X'), png, typed(css, 'Y')])
    const writes = draftWritesOf(session, pendingOf(session, 'site.css', 'index.html', 'site.css'))
    expect(writes.map(write => write.kind === 'save' && write.draft.path)).toStrictEqual([
      'index.html',
      'site.css',
    ])
  })

  it('leaves out files that are not pending, binary files and entries of another opening', () => {
    const session = withFiles(base, [typed(html, 'X'), png, typed(css, 'Y')])
    const pending = [
      ...pendingOf(session, 'site.png', 'gone.css'),
      { openId: Symbol('another opening'), path: 'index.html' },
    ]
    expect(draftWritesOf(session, pending)).toStrictEqual([])
  })

  it('is empty when nothing is open', () => {
    expect(draftWritesOf(null, pendingOf(base, 'index.html'))).toStrictEqual([])
  })

  it('keeps the fingerprint the file had when the draft was made', () => {
    const session = withFiles(base, [typed(html, 'X')])
    const [write] = draftWritesOf(session, pendingOf(session, 'index.html'))
    expect(write.kind === 'save' && write.draft.openedFingerprint).toBe(FINGERPRINT)
  })

  it('keeps, for a restored draft, the version that draft was made from', () => {
    const kept = { lastModified: 7, size: 8 }
    const restored: TextSessionFile = {
      ...html,
      doc: restoreDoc(html.doc, '<p>kept</p>', { draft: kept, disk: FINGERPRINT }),
    }
    const session = withFiles(base, [restored])
    const [write] = draftWritesOf(session, pendingOf(session, 'index.html'))
    expect(write.kind === 'save' && write.draft.openedFingerprint).toBe(kept)
  })
})
