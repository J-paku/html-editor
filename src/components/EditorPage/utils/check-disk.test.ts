// check-disk.tsのテスト
import { describe, expect, it } from 'vitest'
import { isUnchangedOnDisk } from './check-disk'

const OPENED = { lastModified: 1000, size: 10 }

describe('isUnchangedOnDisk', () => {
  it('is true when the disk has the fingerprint that was read', () => {
    expect(isUnchangedOnDisk({ lastModified: 1000, size: 10 }, OPENED)).toBe(true)
  })

  it.each([
    ['the file is gone', null],
    ['the file was modified', { lastModified: 1001, size: 10 }],
    ['the size changed', { lastModified: 1000, size: 11 }],
  ])('is false when %s', (_, disk) => {
    expect(isUnchangedOnDisk(disk, OPENED)).toBe(false)
  })
})
