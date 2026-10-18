// 下書きを保存する形。プロジェクトのキー、IndexedDBのキー、版を持つ記録
import { describe, expect, it } from 'vitest'
import {
  draftKeyOf,
  fromDraftRecord,
  isDraftKeyOf,
  isDraftRecord,
  projectKeyOf,
  toDraftRecord,
  type DraftEntry,
  type DraftRecord,
} from './encode-draft'

const ENTRY: DraftEntry = {
  projectKey: 'folder:slides',
  path: 'index.html',
  openedFingerprint: { lastModified: 1000, size: 10 },
  text: '<h1>edited</h1>',
  savedAt: 2000,
}

const RECORD: DraftRecord = { version: 1, ...ENTRY }

describe('projectKeyOf', () => {
  it('a folder and a file with the same name get different keys', () => {
    expect(projectKeyOf({ kind: 'folder', name: 'slides' })).toBe('folder:slides')
    expect(projectKeyOf({ kind: 'file', name: 'slides' })).toBe('file:slides')
  })
})

describe('draftKeyOf / isDraftKeyOf', () => {
  it('the key is the project and the path', () => {
    expect(draftKeyOf('folder:slides', 'css/a.css')).toEqual(['folder:slides', 'css/a.css'])
  })

  it('a key belongs to the project named first in it', () => {
    expect(isDraftKeyOf(draftKeyOf('folder:slides', 'a.html'), 'folder:slides')).toBe(true)
    expect(isDraftKeyOf(draftKeyOf('folder:other', 'a.html'), 'folder:slides')).toBe(false)
  })

  it('a key that is not a list belongs to no project, even when it starts with the project', () => {
    // 文字列の最初の文字も[0]で読めるので、配列かを確かめないと1文字のプロジェクトが当たってしまう
    expect(isDraftKeyOf('p', 'p')).toBe(false)
    expect(isDraftKeyOf(1, 'p')).toBe(false)
  })
})

describe('toDraftRecord', () => {
  it('adds the version', () => {
    expect(toDraftRecord(ENTRY)).toStrictEqual(RECORD)
  })

  it('keeps only the fields of a draft, so nothing else the object carries is stored', () => {
    const wider = {
      ...ENTRY,
      openedFingerprint: { ...ENTRY.openedFingerprint, name: 'index.html' },
      handle: { kind: 'file' },
    }

    expect(toDraftRecord(wider)).toStrictEqual(RECORD)
  })
})

describe('fromDraftRecord', () => {
  it('drops the version and anything else the record carries', () => {
    const wider = {
      ...RECORD,
      openedFingerprint: { ...ENTRY.openedFingerprint, extra: 1 },
      extra: 1,
    }

    expect(fromDraftRecord(wider)).toStrictEqual(ENTRY)
  })
})

describe('isDraftRecord', () => {
  it('a record written by toDraftRecord', () => {
    expect(isDraftRecord(toDraftRecord(ENTRY))).toBe(true)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'index.html'],
    ['no version', ENTRY],
    ['another version', { ...RECORD, version: 2 }],
    ['a project key that is not a string', { ...RECORD, projectKey: 1 }],
    ['a path that is not a string', { ...RECORD, path: ['index.html'] }],
    ['a text that is not a string', { ...RECORD, text: null }],
    ['a time that is not a number', { ...RECORD, savedAt: '2000' }],
    ['a time that is not finite', { ...RECORD, savedAt: Number.NaN }],
    ['no fingerprint', { ...RECORD, openedFingerprint: undefined }],
    ['a broken fingerprint', { ...RECORD, openedFingerprint: { lastModified: 1 } }],
  ])('%s is not a draft record', (_label, value) => {
    expect(isDraftRecord(value)).toBe(false)
  })
})
