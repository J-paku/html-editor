// catchしたエラーを名前で見分けること
import { describe, expect, it } from 'vitest'
import { isErrorNamed } from './match-error'

describe('isErrorNamed', () => {
  it('a DOMException with the name', () => {
    expect(isErrorNamed(new DOMException('closed', 'AbortError'), 'AbortError')).toBe(true)
  })

  it('an Error whose name was set', () => {
    const error = new Error('gone')
    error.name = 'NotFoundError'

    expect(isErrorNamed(error, 'NotFoundError')).toBe(true)
  })

  it('an error with another name', () => {
    expect(isErrorNamed(new DOMException('no', 'SecurityError'), 'AbortError')).toBe(false)
    expect(isErrorNamed(new TypeError('x'), 'AbortError')).toBe(false)
  })

  it('a value that only looks like an error', () => {
    expect(isErrorNamed({ name: 'AbortError', message: '' }, 'AbortError')).toBe(false)
    expect(isErrorNamed('AbortError', 'AbortError')).toBe(false)
    expect(isErrorNamed(null, 'AbortError')).toBe(false)
  })
})
