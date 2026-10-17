// contentの読み口(read.ts)のテスト
import { describe, expect, it, vi } from 'vitest'
import { strings } from '@content/strings'
import { readStrings } from './read'

// server-onlyはNext.jsのビルド境界専用ガードで、vitest(node環境)では無条件に例外を投げる。
// テストでは中身を持たないmockに差し替え、読み込み専用のread.tsを素通しにする
vi.mock('server-only', () => ({}))

describe('readStrings', () => {
  it('content/strings.ts の文字列の集まりを、そのまま返す', () => {
    expect(readStrings()).toBe(strings)
  })
})
