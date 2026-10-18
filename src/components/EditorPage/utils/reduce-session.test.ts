// reduce-session.tsのテスト
import { describe, expect, it } from 'vitest'
import { canUndo, docText, isDirty, redoDoc, undoDoc } from './doc-state'
import { reduceSession, type SessionAction } from './reduce-session'
import { activeFileOf, baseFingerprintOf, textFileOf } from './read-session'
import { FINGERPRINT, binaryFile, sessionOf, textFile, typed } from './session.test-helper'
import type { Session, TextSessionFile } from './types'

const html = textFile('index.html', '<p>a</p>')
const css = textFile('site.css', 'a {}')
const png = binaryFile('site.png')
const open = (activePath = 'index.html') => sessionOf([html, png, css], activePath)

const draft = (path: string, text: string) => ({
  projectKey: 'folder:site',
  path,
  openedFingerprint: FINGERPRINT,
  text,
  savedAt: 1,
})

const textOf = (session: Session | null, path: string) => {
  if (session === null) throw new Error('the session closed')
  return docText(textFileOf(session, path).doc)
}

describe('opening and closing', () => {
  it('opened replaces whatever was open with the new session', () => {
    const next = open()
    expect(reduceSession(null, { type: 'opened', session: next })).toBe(next)
    expect(reduceSession(open(), { type: 'opened', session: next })).toBe(next)
  })

  it('closed goes back to nothing open', () => {
    expect(reduceSession(open(), { type: 'closed' })).toBeNull()
  })

  it.each<SessionAction>([
    { type: 'closed' },
    { type: 'selected', path: 'site.css' },
    { type: 'edited', path: 'index.html', doc: html.doc },
    { type: 'undone' },
    { type: 'redone' },
    { type: 'saved', openId: Symbol('x'), path: 'index.html', text: '', fingerprint: FINGERPRINT },
    { type: 'reloaded', openId: Symbol('x'), file: html },
    { type: 'restored', drafts: [] },
  ])('with nothing open, $type keeps nothing open', action => {
    expect(reduceSession(null, action)).toBeNull()
  })
})

describe('selected', () => {
  it('shows another text file, keeping the rest of the session', () => {
    const session = open()
    expect(reduceSession(session, { type: 'selected', path: 'site.css' })).toStrictEqual({
      ...session,
      activePath: 'site.css',
    })
  })

  it.each([
    ['a binary file', 'site.png'],
    ['a path the session does not have', 'gone.css'],
  ])('ignores %s', (_, path) => {
    const session = open()
    expect(reduceSession(session, { type: 'selected', path })).toBe(session)
  })
})

describe('edited', () => {
  it('replaces the document of the file at path only', () => {
    const session = open()
    const doc = typed(css, 'X').doc

    const next = reduceSession(session, { type: 'edited', path: 'site.css', doc })

    expect(next?.files).toStrictEqual([html, png, { ...css, doc }])
    expect(next?.activePath).toBe('index.html')
  })

  it('leaves a binary file with that path as it is', () => {
    const session = open()
    const next = reduceSession(session, { type: 'edited', path: 'site.png', doc: html.doc })
    expect(next?.files).toStrictEqual(session.files)
  })
})

describe('undone / redone', () => {
  // fileにinsertを入力して元に戻したもの。やり直すものがある
  const typedAndUndone = (file: TextSessionFile, insert: string): TextSessionFile => ({
    ...file,
    doc: undoDoc(typed(file, insert).doc),
  })

  it('undoes in the file shown in the code editor only', () => {
    const session = sessionOf([typed(html, 'X'), png, typed(css, 'Y')], 'index.html')
    const next = reduceSession(session, { type: 'undone' })
    expect(textOf(next, 'index.html')).toBe('<p>a</p>')
    expect(textOf(next, 'site.css')).toBe('a {}Y')
  })

  it('redoes in the file shown in the code editor only', () => {
    const session = sessionOf(
      [typedAndUndone(html, 'X'), png, typedAndUndone(css, 'Y')],
      'index.html'
    )
    const next = reduceSession(session, { type: 'redone' })
    expect(textOf(next, 'index.html')).toBe('<p>a</p>X')
    expect(textOf(next, 'site.css')).toBe('a {}')
  })
})

// pathの文字のファイルが、保存した時点の文書と違うか
const dirtyAt = (session: Session, path: string) => {
  const file = textFileOf(session, path)
  return isDirty(file.doc, file.savedDoc)
}

describe('saved', () => {
  it('records the written text and the new fingerprint of the file at path', () => {
    const session = sessionOf([typed(html, 'X'), typed(css, 'Y')])
    const fingerprint = { lastModified: 2000, size: 11 }

    const next = reduceSession(session, {
      type: 'saved',
      openId: session.openId,
      path: 'index.html',
      text: '<p>a</p>X',
      fingerprint,
    }) as Session

    expect(dirtyAt(next, 'index.html')).toBe(false)
    expect(textFileOf(next, 'index.html').fingerprint).toBe(fingerprint)
    expect(dirtyAt(next, 'site.css')).toBe(true)
    expect(textFileOf(next, 'site.css').fingerprint).toBe(FINGERPRINT)
  })

  it('keeps the document state as it is, so the code editor is not handed a new one', () => {
    const session = sessionOf([typed(html, 'X')])
    const next = reduceSession(session, {
      type: 'saved',
      openId: session.openId,
      path: 'index.html',
      text: '<p>a</p>X',
      fingerprint: FINGERPRINT,
    }) as Session
    expect(textFileOf(next, 'index.html').doc).toBe(textFileOf(session, 'index.html').doc)
  })

  it('leaves typing done during the write as a change', () => {
    const session = sessionOf([typed(typed(html, 'X'), 'Y')])
    const next = reduceSession(session, {
      type: 'saved',
      openId: session.openId,
      path: 'index.html',
      text: '<p>a</p>X',
      fingerprint: FINGERPRINT,
    }) as Session
    expect(dirtyAt(next, 'index.html')).toBe(true)
  })
})

describe('reloaded', () => {
  it('replaces the file at the path of the new file, dropping its edits', () => {
    const session = sessionOf([typed(html, 'X'), css])
    const disk: TextSessionFile = textFile('index.html', '<p>disk</p>')

    const next = reduceSession(session, {
      type: 'reloaded',
      openId: session.openId,
      file: disk,
    }) as Session

    expect(next.files).toStrictEqual([disk, css])
  })
})

describe('saved / reloaded of another opening', () => {
  // 同じパスを持つプロジェクトが今開いていて、動作はその前の開き方が始めたもの
  const now = sessionOf([typed(html, 'X'), css])
  const earlier = Symbol('the opening closed before the disk answered')

  it.each<SessionAction>([
    {
      type: 'saved',
      openId: earlier,
      path: 'index.html',
      text: '<p>old</p>',
      fingerprint: FINGERPRINT,
    },
    { type: 'reloaded', openId: earlier, file: textFile('index.html', '<p>old</p>') },
  ])('$type changes nothing in the opening open now', action => {
    expect(reduceSession(now, action)).toBe(now)
  })
})

describe('restored', () => {
  it('puts the text of each draft into its file, as unsaved and as one undoable step', () => {
    const session = open()

    const next = reduceSession(session, {
      type: 'restored',
      drafts: [draft('index.html', '<p>kept</p>'), draft('site.css', 'b {}')],
    }) as Session

    const restored = activeFileOf(next)
    expect(docText(restored.doc)).toBe('<p>kept</p>')
    expect(isDirty(restored.doc, restored.savedDoc)).toBe(true)
    expect(canUndo(restored.doc)).toBe(true)
    expect(docText(undoDoc(restored.doc))).toBe('<p>a</p>')
    expect(textOf(next, 'site.css')).toBe('b {}')
    expect(next.files[1]).toBe(png)
  })

  it('gives each file the fingerprint its draft was made from, so a save checks the disk against it', () => {
    const kept = { lastModified: 500, size: 3 }
    const next = reduceSession(open(), {
      type: 'restored',
      drafts: [{ ...draft('site.css', 'b {}'), openedFingerprint: kept }],
    }) as Session

    expect(baseFingerprintOf(textFileOf(next, 'site.css'))).toBe(kept)
    expect(baseFingerprintOf(textFileOf(next, 'index.html'))).toBe(FINGERPRINT)
  })

  it('keeps the fingerprint read from disk on the file, and goes back to it when the restore is undone', () => {
    const kept = { lastModified: 500, size: 3 }
    const next = reduceSession(open('site.css'), {
      type: 'restored',
      drafts: [{ ...draft('site.css', 'b {}'), openedFingerprint: kept }],
    }) as Session
    const restored = textFileOf(next, 'site.css')
    expect(restored.fingerprint).toBe(FINGERPRINT)

    const undone = reduceSession(next, { type: 'undone' }) as Session
    expect(baseFingerprintOf(textFileOf(undone, 'site.css'))).toBe(FINGERPRINT)
    expect(baseFingerprintOf({ ...restored, doc: redoDoc(undoDoc(restored.doc)) })).toBe(kept)
  })

  it('keeps the line breaks of the draft in a CRLF file', () => {
    const crlf = textFile('index.html', '<p>a</p>\r\n<p>b</p>\r\n')
    const next = reduceSession(sessionOf([crlf]), {
      type: 'restored',
      drafts: [draft('index.html', '<p>a</p>\r\n<p>kept</p>\r\n')],
    })
    expect(textOf(next, 'index.html')).toBe('<p>a</p>\r\n<p>kept</p>\r\n')
  })
})
