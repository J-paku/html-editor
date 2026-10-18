// ディスクのファイルの指紋。取ること、比べること、保存されていた形を確かめること
import { describe, expect, it } from 'vitest'
import { fingerprintOf, isFileFingerprint, isSameFingerprint } from './compare-fingerprint'

describe('fingerprintOf', () => {
  it('takes the last modified time and size of a File and nothing else', () => {
    const file = new File(['<h1>hi</h1>'], 'index.html', { lastModified: 1234 })

    const fingerprint = fingerprintOf(file)

    expect(fingerprint).toStrictEqual({ lastModified: 1234, size: 11 })
    expect(Object.keys(fingerprint)).toEqual(['lastModified', 'size'])
  })
})

describe('isSameFingerprint', () => {
  const base = { lastModified: 1000, size: 10 }

  it('the same time and size are the same', () => {
    expect(isSameFingerprint(base, { lastModified: 1000, size: 10 })).toBe(true)
  })

  it('a different time or a different size is different', () => {
    expect(isSameFingerprint(base, { lastModified: 1001, size: 10 })).toBe(false)
    expect(isSameFingerprint(base, { lastModified: 1000, size: 11 })).toBe(false)
  })
})

describe('isFileFingerprint', () => {
  it('two finite numbers are a fingerprint', () => {
    expect(isFileFingerprint({ lastModified: 0, size: 0 })).toBe(true)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a number', 5],
    ['no size', { lastModified: 1 }],
    ['no time', { size: 1 }],
    ['a size in a string', { lastModified: 1, size: '1' }],
    ['a time in a string', { lastModified: '1', size: 1 }],
    ['a size that is not finite', { lastModified: 1, size: Number.POSITIVE_INFINITY }],
    ['a time that is not a number', { lastModified: Number.NaN, size: 1 }],
  ])('%s is not a fingerprint', (_label, value) => {
    expect(isFileFingerprint(value)).toBe(false)
  })
})
