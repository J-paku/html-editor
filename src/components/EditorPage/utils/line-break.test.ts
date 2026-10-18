// 原本の改行の形から行の分け方とつなぎ方を選ぶ(line-break.ts)のテスト。
// 状態へ入れて取り出したときに原本へ戻ることは ./doc-state.test.ts が見る
import { describe, expect, it } from 'vitest'
import { lineBreakOf } from './line-break'

describe('lineBreakOf', () => {
  it.each([
    ['空の文字', ''],
    ['改行の無い文字', '<p>a</p>'],
    ['LF だけ', '<p>\n  a\n</p>\n'],
  ])('\\r が無ければ(%s)既定で分け、\\n でつなぐ', (_, text) => {
    expect(lineBreakOf(text)).toEqual({ splitOnLfOnly: false, joinWithCrlf: false })
  })

  it.each([
    ['1つ', 'a\r\nb'],
    ['終わりにも', '<p>\r\n  a\r\n</p>\r\n'],
    ['\\r\\n だけ', '\r\n'],
  ])('改行が全部 \\r\\n なら(%s)既定で分け、\\r\\n でつなぐ', (_, text) => {
    expect(lineBreakOf(text)).toEqual({ splitOnLfOnly: false, joinWithCrlf: true })
  })

  it.each([
    ['\\r\\n と \\n が混ざる', 'a\r\nb\nc'],
    ['\\r だけの改行', 'a\rb'],
    ['\\r\\n の前に \\r が重なる', 'a\r\r\nb'],
    ['\\r で終わる', 'a\r\nb\r'],
    ['\\n で始まる', '\na\r\n'],
  ])('それ以外(%s)は \\n だけで分け、\\n でつなぐ', (_, text) => {
    expect(lineBreakOf(text)).toEqual({ splitOnLfOnly: true, joinWithCrlf: false })
  })
})
