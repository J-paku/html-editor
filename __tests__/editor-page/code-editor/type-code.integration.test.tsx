// コード窓(CodeEditor)の統合テストのうち、書き換え。部品を実際の Chromium で直接描き、利用者の入力が新しい状態として親へ返ることと、
// 入力がファイルごとのやり直しの記録に入る(コード窓の Ctrl+Z でも、親が utils で元に戻しても同じ記録を使う)ことを見る
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import CodeEditor from '@/components/EditorPage/components/CodeEditor/container'
import { createDocState, isDirty, redoDoc, undoDoc } from '@/components/EditorPage/utils/doc-state'
import {
  LABEL,
  codeBox,
  lastState,
  lastText,
  typeAtLineEnd,
  type OnChange,
} from './code-editor.test-helper'

afterEach(cleanup)

const ORIGINAL = '<p>a</p>'

// 原本の文字の状態を描き、渡した状態・onChange の受け口・描き直しを返す
const renderOriginal = () => {
  const state = createDocState('index.html', ORIGINAL)
  const onChange: OnChange = vi.fn()
  const view = render(<CodeEditor state={state} onChange={onChange} label={LABEL} />)
  return { state, onChange, ...view }
}

describe('書き換え', () => {
  it('入力すると、入力した字を含む新しい状態を onChange で返す', async () => {
    const { state, onChange } = renderOriginal()

    await typeAtLineEnd('X')
    await expect.poll(() => lastText(onChange)).toBe(`${ORIGINAL}X`)
    expect(isDirty(lastState(onChange), state.doc)).toBe(true)
  })

  it('返した状態をそのまま渡し直しても、書いた字は消えず、続けて書ける', async () => {
    const { onChange, rerender } = renderOriginal()
    await typeAtLineEnd('X')
    await expect.poll(() => lastText(onChange)).toBe(`${ORIGINAL}X`)

    rerender(<CodeEditor state={lastState(onChange)} onChange={onChange} label={LABEL} />)
    await userEvent.keyboard('Y')
    await expect.poll(() => lastText(onChange)).toBe(`${ORIGINAL}XY`)
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>XY$/)
  })

  it('onChange を替えると、その後の入力は新しい onChange へ返す', async () => {
    const { state, onChange: before, rerender } = renderOriginal()
    await expect.element(codeBox()).toBeVisible()
    const after: OnChange = vi.fn()
    rerender(<CodeEditor state={state} onChange={after} label={LABEL} />)
    const callsBefore = before.mock.calls.length

    await typeAtLineEnd('Z')
    await expect.poll(() => lastText(after)).toBe(`${ORIGINAL}Z`)
    expect(before.mock.calls.length).toBe(callsBefore)
  })

  it('BOM 付きの CRLF の文書に字と改行を打っても、BOM と CRLF のまま返す', async () => {
    const onChange: OnChange = vi.fn()
    const text = '﻿<p>a</p>\r\n<p>b</p>\r\n'
    render(
      <CodeEditor state={createDocState('index.html', text)} onChange={onChange} label={LABEL} />
    )
    await codeBox().click()

    // 文書の頭(1行目)の終わりへ動かしてから打つ
    await userEvent.keyboard('{Control>}{Home}{/Control}{End}X{Enter}Y')
    await expect.poll(() => lastText(onChange)).toBe('﻿<p>a</p>X\r\nY\r\n<p>b</p>\r\n')
  })

  it('コード窓の中の Ctrl+Z で入力を元に戻す', async () => {
    const { onChange } = renderOriginal()
    await typeAtLineEnd('X')
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>X$/)

    await userEvent.keyboard('{Control>}z{/Control}')
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>$/)
    await expect.poll(() => lastText(onChange)).toBe(ORIGINAL)
  })

  it('入力の後の状態を親が utils で元に戻す・やり直すと、見える字も戻る・進む', async () => {
    const { onChange, rerender } = renderOriginal()
    await typeAtLineEnd('X')
    await expect.poll(() => lastText(onChange)).toBe(`${ORIGINAL}X`)

    const undone = undoDoc(lastState(onChange))
    rerender(<CodeEditor state={undone} onChange={onChange} label={LABEL} />)
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>$/)

    rerender(<CodeEditor state={redoDoc(undone)} onChange={onChange} label={LABEL} />)
    await expect.element(codeBox()).toHaveTextContent(/^<p>a<\/p>X$/)
  })

  it('ディスクの中身で作り直した状態を渡すと、その字を見せ、Ctrl+Z でも前の入力へ戻らない', async () => {
    // Ctrl+Z の後に1字打ち、その字だけが足されたことで、Ctrl+Z が何も戻さなかったことを確かめる
    const { onChange, rerender } = renderOriginal()
    await typeAtLineEnd('X')
    await expect.poll(() => lastText(onChange)).toBe(`${ORIGINAL}X`)

    rerender(
      <CodeEditor
        state={createDocState('index.html', '<p>disk</p>')}
        onChange={onChange}
        label={LABEL}
      />
    )
    await expect.element(codeBox()).toHaveTextContent(/^<p>disk<\/p>$/)

    await typeAtLineEnd('{Control>}z{/Control}Q')
    await expect.poll(() => lastText(onChange)).toBe('<p>disk</p>Q')
    await expect.element(codeBox()).toHaveTextContent(/^<p>disk<\/p>Q$/)
  })
})
