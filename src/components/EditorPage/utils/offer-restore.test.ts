// offer-restore.tsのテスト
import { describe, expect, it } from 'vitest'
import type { DraftEntry } from '@/utils/encode-draft'
import { savedDocOf } from './doc-state'
import {
  dismissedOf,
  hasAskedEdits,
  heldPathsOf,
  offerStateOf,
  reaskedOf,
  restoreOfferOf,
  shownOfferOf,
  type OfferState,
  type RestoreOffer,
} from './offer-restore'
import { FINGERPRINT, binaryFile, sessionOf, textFile, typed } from './session.test-helper'
import { forOpening } from './tie-opening'
import type { Session, TextSessionFile } from './types'

const CHANGED = { lastModified: FINGERPRINT.lastModified + 1, size: FINGERPRINT.size }

const draft = (path: string, openedFingerprint = FINGERPRINT): DraftEntry => ({
  projectKey: 'folder:site',
  path,
  openedFingerprint,
  text: `<p>${path} kept</p>`,
  savedAt: 1,
})

const files = [textFile('a.html'), binaryFile('b.png'), textFile('c.css')]

describe('restoreOfferOf', () => {
  it('offers the drafts of text files the project has, in the order given', () => {
    const drafts = [draft('a.html'), draft('c.css')]
    expect(restoreOfferOf('folder:site', files, drafts)).toStrictEqual({
      projectKey: 'folder:site',
      drafts,
      hasDiskChanges: false,
    })
  })

  it('leaves out drafts of files the project no longer has, or that are not text', () => {
    expect(
      restoreOfferOf('folder:site', files, [draft('gone.html'), draft('b.png'), draft('c.css')])
        ?.drafts
    ).toStrictEqual([draft('c.css')])
  })

  it('tells when a file changed on disk after its draft was kept', () => {
    expect(
      restoreOfferOf('folder:site', files, [draft('a.html'), draft('c.css', CHANGED)])
        ?.hasDiskChanges
    ).toBe(true)
  })

  it('does not count a changed file that has no draft to restore', () => {
    expect(
      restoreOfferOf('folder:site', files, [draft('a.html'), draft('gone.css', CHANGED)])
        ?.hasDiskChanges
    ).toBe(false)
  })

  it.each([
    ['no drafts', []],
    ['only drafts of files the project lacks', [draft('gone.html')]],
  ])('is null with %s', (_, drafts) => {
    expect(restoreOfferOf('folder:site', files, drafts)).toBeNull()
  })
})

// sessionで尋ねる、a.htmlとc.cssの下書きについての問い。リテラルで書く。fixtureはファイルを読むときに作るので、
// そこでrestoreOfferOfの変異体が働くと、このファイルのテストが1つも走らなくなる
const session = sessionOf(files)
const offer: RestoreOffer = {
  projectKey: 'folder:site',
  drafts: [draft('a.html'), draft('c.css')],
  hasDiskChanges: false,
}
const asking: OfferState = { kind: 'asking', offer, dismissed: null }
const discarding: OfferState = { kind: 'discarding', offer }
// currentでEscapeで閉じた後の問い(同じ理由で、各テストの中で作る)
const closedIn = (current: Session) =>
  dismissedOf(forOpening(current, asking), current)?.value as OfferState

// pathの文字のファイルをchangeが返すものに置き換えたsession
const changed = (path: string, change: (file: TextSessionFile) => TextSessionFile): Session => ({
  ...session,
  files: session.files.map(file =>
    file.kind === 'text' && file.path === path ? change(file) : file
  ),
})
const moved = (file: TextSessionFile): TextSessionFile => ({
  ...file,
  doc: file.doc.update({ selection: { anchor: 1 } }).state,
})

describe('offerStateOf', () => {
  it('asks about the drafts found, for the opening of the session, shown at once', () => {
    expect(offerStateOf(session, [draft('a.html'), draft('c.css')])).toStrictEqual(
      forOpening(session, asking)
    )
  })

  it('is null when there is nothing to offer', () => {
    expect(offerStateOf(session, [draft('gone.html')])).toBeNull()
  })
})

describe('shownOfferOf', () => {
  it('shows the offer while asking and not closed', () => {
    expect(shownOfferOf(asking, session)).toBe(offer)
  })

  it.each<[string, OfferState | null, Session | null]>([
    ['nothing is asked', null, session],
    ['nothing is open', asking, null],
    ['the drafts are being discarded', discarding, session],
  ])('shows nothing when %s', (_, state, current) => {
    expect(shownOfferOf(state, current)).toBeNull()
  })

  describe('after Escape closed it', () => {
    it('stays closed while the files keep their text, also when the cursor moves', () => {
      expect(shownOfferOf(closedIn(session), session)).toBeNull()
      expect(shownOfferOf(closedIn(session), changed('c.css', moved))).toBeNull()
    })

    it.each(['a.html', 'c.css'])('shows again once the text of %s changes', path => {
      expect(
        shownOfferOf(
          closedIn(session),
          changed(path, file => typed(file, 'x'))
        )
      ).toBe(offer)
    })

    it('stays closed when a file outside the question changes', () => {
      const withOther = sessionOf([...files, textFile('d.css')])
      const closedThere = closedIn(withOther)
      const otherTyped: Session = {
        ...withOther,
        files: withOther.files.map(file =>
          file.kind === 'text' && file.path === 'd.css' ? typed(file, 'x') : file
        ),
      }
      expect(shownOfferOf(closedThere, otherTyped)).toBeNull()
    })
  })
})

describe('dismissedOf', () => {
  it('answers nothing: the offer is kept, for the same opening', () => {
    const next = dismissedOf(forOpening(session, asking), session)
    expect(next?.openId).toBe(session.openId)
    expect(next?.value.kind === 'asking' && next.value.offer).toBe(offer)
  })

  it.each<[string, ReturnType<typeof forOpening<OfferState>> | null, Session | null]>([
    ['nothing is kept', null, session],
    ['nothing is open', forOpening(session, asking), null],
    ['the question is of another opening', forOpening(sessionOf(files), asking), session],
    ['the drafts are being discarded', forOpening(session, discarding), session],
  ])('leaves what is kept as it is when %s', (_, kept, current) => {
    expect(dismissedOf(kept, current)).toBe(kept)
  })
})

describe('reaskedOf', () => {
  it('shows a closed question again', () => {
    const closed = dismissedOf(forOpening(session, asking), session)
    const again = reaskedOf(closed)
    expect(again?.openId).toBe(session.openId)
    expect(shownOfferOf(again?.value ?? null, session)).toBe(offer)
  })

  it.each([
    ['nothing is kept', null],
    ['the drafts are being discarded', forOpening(session, discarding)],
  ])('leaves what is kept as it is when %s', (_, kept) => {
    expect(reaskedOf(kept)).toBe(kept)
  })
})

describe('heldPathsOf', () => {
  it.each([
    ['asking', asking],
    ['discarding', discarding],
  ])('holds the files of the question while %s', (_, state) => {
    expect(heldPathsOf(state)).toStrictEqual(new Set(['a.html', 'c.css']))
  })

  it('holds nothing without a question', () => {
    expect(heldPathsOf(null)).toStrictEqual(new Set())
  })
})

describe('hasAskedEdits', () => {
  it('is true while asking and a file of the question has unsaved edits', () => {
    expect(
      hasAskedEdits(
        asking,
        changed('c.css', file => typed(file, 'x'))
      )
    ).toBe(true)
  })

  it('is false when the files of the question are as saved (also after a save)', () => {
    const saved = changed('a.html', file => {
      const edited = typed(file, 'x')
      return { ...edited, savedDoc: savedDocOf(edited.doc, '<p>a.html</p>x') }
    })
    expect(hasAskedEdits(asking, session)).toBe(false)
    expect(hasAskedEdits(asking, saved)).toBe(false)
  })

  it.each<[string, OfferState | null]>([
    ['nothing is asked', null],
    ['the drafts are being discarded', discarding],
  ])('is false when %s', (_, state) => {
    expect(
      hasAskedEdits(
        state,
        changed('a.html', file => typed(file, 'x'))
      )
    ).toBe(false)
  })

  it('is false when only a file outside the question has unsaved edits', () => {
    const withOther = sessionOf([...files, typed(textFile('d.css'), 'x')])
    expect(hasAskedEdits(asking, withOther)).toBe(false)
  })
})
