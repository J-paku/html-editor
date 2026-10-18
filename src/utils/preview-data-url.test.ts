// preview-data-url.ts のテスト
import { describe, expect, it } from 'vitest'
import { CHUNK_BYTES, toDataUrl } from './preview-data-url'

// 決まった並びの、くり返しの無いバイト列(xorshift)。組の順番が入れ替わったり重なったりすると結果が変わる
const bytesOf = (size: number): Uint8Array => {
  const bytes = new Uint8Array(size)
  let state = 2463534242
  for (let i = 0; i < size; i++) {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    bytes[i] = state & 255
  }
  return bytes
}

// 比べる相手は Node の Buffer の Base64(btoa も組み分けも通らない、別の実装)
const expectedOf = (bytes: Uint8Array, contentType: string): string =>
  `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`

describe('toDataUrl', () => {
  it('encodes text as UTF-8 base64 under the given type', () => {
    expect(toDataUrl('a{}', 'text/css;charset=utf-8')).toBe(
      'data:text/css;charset=utf-8;base64,YXt9'
    )
  })

  it('encodes characters outside ASCII as their UTF-8 bytes', () => {
    // é は UTF-8 で C3 A9
    expect(toDataUrl('é', 'text/plain')).toBe('data:text/plain;base64,w6k=')
  })

  it('encodes bytes as they are, including 0 and 255', () => {
    expect(toDataUrl(new Uint8Array([0, 255, 16]), 'image/png')).toBe('data:image/png;base64,AP8Q')
  })

  it('encodes an empty file', () => {
    expect(toDataUrl('', 'text/plain')).toBe('data:text/plain;base64,')
    expect(toDataUrl(new Uint8Array(0), 'image/png')).toBe('data:image/png;base64,')
  })

  it('encodes bytes of every size around the chunk boundaries the same as a one-shot encoder', () => {
    const sizes = [
      1,
      2,
      3,
      CHUNK_BYTES - 1,
      CHUNK_BYTES,
      CHUNK_BYTES + 1,
      2 * CHUNK_BYTES,
      2 * CHUNK_BYTES + 2,
    ]
    for (const size of sizes) {
      const bytes = bytesOf(size)
      expect(toDataUrl(bytes, 'image/png'), `${size} bytes`).toBe(expectedOf(bytes, 'image/png'))
    }
  })

  it('encodes text whose UTF-8 bytes cross a chunk boundary inside a character', () => {
    // 1文字が2バイトで、奇数バイト目で組が切れる
    const text = `a${'é'.repeat(CHUNK_BYTES)}`
    expect(toDataUrl(text, 'text/plain')).toBe(
      expectedOf(new TextEncoder().encode(text), 'text/plain')
    )
  })

  it('encodes an 8MB file too large for one call of String.fromCharCode with spread arguments', () => {
    const bytes = bytesOf(8 * 1024 * 1024)
    expect(toDataUrl(bytes, 'image/png')).toBe(expectedOf(bytes, 'image/png'))
  })
})
