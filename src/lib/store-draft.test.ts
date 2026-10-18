// 保存していない編集をIndexedDBに残し、プロジェクトごとに読み戻すこと
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeIndexedDb } from './fake-indexed-db.test-helper'

const NOW = 1_800_000_000_000
const FINGERPRINT = { lastModified: 1000, size: 10 }

let fake: ReturnType<typeof createFakeIndexedDb>

// store-draft.tsはモジュールが生きている間1つの接続を持ち続けるので、テストごとに新しいデータベースに対して
// モジュールを読み込み直す
const load = async () => {
  vi.resetModules()
  return import('./store-draft')
}

const draft = (projectKey: string, path: string, text = `<p>${path}</p>`) => ({
  projectKey,
  path,
  openedFingerprint: FINGERPRINT,
  text,
})

beforeEach(() => {
  fake = createFakeIndexedDb()
  vi.stubGlobal('indexedDB', fake.factory)
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('saveDraft / listDrafts', () => {
  it('a kept draft comes back with the time it was kept', async () => {
    const { listDrafts, saveDraft } = await load()

    await saveDraft(draft('folder:slides', 'index.html', '<h1>edited</h1>'))

    expect(await listDrafts('folder:slides')).toStrictEqual([
      {
        projectKey: 'folder:slides',
        path: 'index.html',
        openedFingerprint: FINGERPRINT,
        text: '<h1>edited</h1>',
        savedAt: NOW,
      },
    ])
  })

  it('is kept in a database of its own, versioned, under the project and the path', async () => {
    const { saveDraft } = await load()
    // 呼ぶ側が下書きと一緒に持っているかもしれないもの。IndexedDBに届いてはいけない
    const carrying = { ...draft('folder:slides', 'index.html'), handle: { kind: 'file' } }

    await saveDraft(carrying)

    expect(fake.layout()).toEqual({ 'html-editor': ['drafts'] })
    expect(fake.records('html-editor', 'drafts')).toEqual([
      [
        ['folder:slides', 'index.html'],
        {
          version: 1,
          projectKey: 'folder:slides',
          path: 'index.html',
          openedFingerprint: FINGERPRINT,
          text: '<p>index.html</p>',
          savedAt: NOW,
        },
      ],
    ])
  })

  it('keeping the same project and path again replaces the earlier draft', async () => {
    const { listDrafts, saveDraft } = await load()

    await saveDraft(draft('folder:slides', 'index.html', 'first'))
    await saveDraft(draft('folder:slides', 'index.html', 'second'))

    expect((await listDrafts('folder:slides')).map(entry => entry.text)).toEqual(['second'])
  })

  it('lists only the drafts of the project asked for, sorted by path', async () => {
    const { listDrafts, saveDraft } = await load()

    await saveDraft(draft('folder:slides', 'index.html'))
    await saveDraft(draft('folder:other', 'index.html'))
    await saveDraft(draft('folder:slides', 'css/style.css'))
    await saveDraft(draft('file:slides', 'about.html'))

    expect((await listDrafts('folder:slides')).map(entry => entry.path)).toEqual([
      'css/style.css',
      'index.html',
    ])
    expect((await listDrafts('folder:other')).map(entry => entry.path)).toEqual(['index.html'])
  })

  it('leaves out records of an older or broken shape', async () => {
    fake.seed('html-editor', 'drafts', ['folder:slides', 'old.html'], {
      ...draft('folder:slides', 'old.html'),
      savedAt: NOW,
      version: 0,
    })
    fake.seed('html-editor', 'drafts', ['folder:slides', 'broken.html'], 'broken')
    const { listDrafts, saveDraft } = await load()

    await saveDraft(draft('folder:slides', 'index.html'))

    expect((await listDrafts('folder:slides')).map(entry => entry.path)).toEqual(['index.html'])
  })

  it('nothing kept → an empty list', async () => {
    const { listDrafts } = await load()

    expect(await listDrafts('folder:slides')).toEqual([])
  })
})

describe('deleteDraft', () => {
  it('drops the draft of one file and leaves the others', async () => {
    const { deleteDraft, listDrafts, saveDraft } = await load()
    await saveDraft(draft('folder:slides', 'index.html'))
    await saveDraft(draft('folder:slides', 'about.html'))
    await saveDraft(draft('folder:other', 'index.html'))

    await deleteDraft('folder:slides', 'index.html')

    expect((await listDrafts('folder:slides')).map(entry => entry.path)).toEqual(['about.html'])
    expect((await listDrafts('folder:other')).map(entry => entry.path)).toEqual(['index.html'])
  })
})

describe('clearDrafts', () => {
  it('drops every draft of the project, broken ones too, and leaves other projects alone', async () => {
    fake.seed('html-editor', 'drafts', ['folder:slides', 'broken.html'], 'broken')
    fake.seed('html-editor', 'drafts', ['folder:other', 'broken.html'], 'broken')
    fake.seed('html-editor', 'drafts', 'folder:slides', 'a key that is not a list')
    const { clearDrafts, listDrafts, saveDraft } = await load()
    await saveDraft(draft('folder:slides', 'index.html'))
    await saveDraft(draft('folder:slides', 'about.html'))
    await saveDraft(draft('folder:other', 'index.html'))

    await clearDrafts('folder:slides')

    expect(await listDrafts('folder:slides')).toEqual([])
    expect(fake.records('html-editor', 'drafts').map(([key]) => key)).toEqual([
      ['folder:other', 'broken.html'],
      'folder:slides',
      ['folder:other', 'index.html'],
    ])
  })
})
