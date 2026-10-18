// ignore-change.tsのテスト
import { describe, expect, it } from 'vitest'
import { ignoreChange } from './ignore-change'

describe('ignoreChange', () => {
  it('does nothing and returns nothing', () => {
    expect(ignoreChange()).toBeUndefined()
  })
})
