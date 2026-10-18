// コード窓(CodeEditor)の統合テストのうち、見せるもの。部品を実際の Chromium で直接描き、
// 渡した文書の状態の字が名前の付いた書き込み欄に見えることと、親が状態や名前を差し替えると見えるものが替わることを見る
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CodeEditor from '@/components/EditorPage/components/CodeEditor/container'
import { createDocState } from '@/components/EditorPage/utils/doc-state'
import { LABEL, codeBox } from './code-editor.test-helper'

afterEach(cleanup)

describe('見せるもの', () => {
  it('渡した状態の文書を、名前の付いた書き込み欄に見せる', async () => {
    render(
      <CodeEditor
        state={createDocState('index.html', '<h1>題</h1>')}
        onChange={vi.fn()}
        label={LABEL}
      />
    )

    await expect.element(codeBox()).toHaveTextContent(/^<h1>題<\/h1>$/)
  })

  it('構文の字句に、色を付けるためのクラス(tok- で始まる名前)を付ける', async () => {
    render(
      <CodeEditor
        state={createDocState('index.html', '<h1>題</h1>')}
        onChange={vi.fn()}
        label={LABEL}
      />
    )

    await expect
      .poll(() => codeBox().element().querySelector('.tok-typeName')?.textContent)
      .toBe('h1')
  })

  it('親が状態を差し替えると(ファイルの切り替え)、見える字が替わり、名前はそのまま', async () => {
    const htmlDoc = createDocState('index.html', '<h1>題</h1>')
    const cssDoc = createDocState('site.css', 'h1 { margin: 0 }')
    const { rerender } = render(<CodeEditor state={htmlDoc} onChange={vi.fn()} label={LABEL} />)
    await expect.element(codeBox()).toHaveTextContent(/^<h1>題<\/h1>$/)

    rerender(<CodeEditor state={cssDoc} onChange={vi.fn()} label={LABEL} />)
    await expect.element(codeBox()).toHaveTextContent(/^h1 \{ margin: 0 \}$/)

    rerender(<CodeEditor state={htmlDoc} onChange={vi.fn()} label={LABEL} />)
    await expect.element(codeBox()).toHaveTextContent(/^<h1>題<\/h1>$/)
  })

  it('名前を替えると、書き込み欄の名前が替わる', async () => {
    const state = createDocState('index.html', '<p>a</p>')
    const { rerender } = render(<CodeEditor state={state} onChange={vi.fn()} label={LABEL} />)
    await expect.element(codeBox()).toBeVisible()

    rerender(<CodeEditor state={state} onChange={vi.fn()} label='site.css のコード' />)
    await expect.element(codeBox('site.css のコード')).toHaveTextContent(/^<p>a<\/p>$/)
    expect(codeBox().query()).toBeNull()
  })

  it('外すと、書き込み欄も消える', async () => {
    const { unmount } = render(
      <CodeEditor
        state={createDocState('index.html', '<p>a</p>')}
        onChange={vi.fn()}
        label={LABEL}
      />
    )
    await expect.element(codeBox()).toBeVisible()

    unmount()
    expect(codeBox().query()).toBeNull()
  })
})
