// preview-split-quotes.ts のテスト
import { describe, expect, it } from 'vitest'
import { splitQuotes } from './preview-split-quotes'

describe('splitQuotes', () => {
  it('splits a double-quoted value', () => {
    expect(splitQuotes('"my a.png"')).toEqual({ quote: '"', inner: 'my a.png' })
  })

  it('splits a single-quoted value', () => {
    expect(splitQuotes(`'my a.png'`)).toEqual({ quote: `'`, inner: 'my a.png' })
  })

  it('returns a bare value as it is with no quote', () => {
    expect(splitQuotes('a.png')).toEqual({ quote: '', inner: 'a.png' })
  })

  it('splits an empty quoted value', () => {
    expect(splitQuotes('""')).toEqual({ quote: '"', inner: '' })
  })
})
