// 文字のファイルを、文字列をUTF-8で書き戻すと同じバイトになるように文字にすること
import { describe, expect, it } from 'vitest'
import { decodeUtf8 } from './decode-text'

const encode = (text: string) => new TextEncoder().encode(text)

describe('decodeUtf8', () => {
  it('decodes UTF-8, including characters of several bytes', () => {
    expect(decodeUtf8(encode('<p>こんにちは 안녕 😀</p>'))).toBe('<p>こんにちは 안녕 😀</p>')
  })

  it('decodes an ArrayBuffer as well as a byte view', () => {
    expect(decodeUtf8(encode('a').buffer)).toBe('a')
  })

  it('an empty file is an empty string', () => {
    expect(decodeUtf8(new Uint8Array())).toBe('')
  })

  it('keeps the byte order mark, so encoding the string again gives the same bytes', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x3c, 0x70, 0x3e])

    const text = decodeUtf8(bytes)

    expect(text).toBe('﻿<p>')
    expect([...encode(text ?? '')]).toEqual([...bytes])
  })

  it('bytes that are not valid UTF-8 (Shift_JIS) → null instead of replacement characters', () => {
    // Shift_JISの「あ」
    expect(decodeUtf8(new Uint8Array([0x82, 0xa0]))).toBeNull()
  })
})
