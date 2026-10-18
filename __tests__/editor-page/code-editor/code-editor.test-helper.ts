// コード窓(CodeEditor)の統合テストが共有する部品。書き込み欄の探し方・行の終わりへの入力・onChange が受け取った状態の読み方
import type { EditorState } from '@codemirror/state'
import type { Mock } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { docText } from '@/components/EditorPage/utils/doc-state'

// テストで渡す書き込み欄の名前(画面では content の文字を渡す)
export const LABEL = 'コード'

export type OnChange = Mock<(state: EditorState) => void>

// 名前がちょうど name の書き込み欄(CodeMirror の role=textbox の要素)
export const codeBox = (name = LABEL) => page.getByRole('textbox', { name, exact: true })

// 書き込み欄を押してカーソルを今の行の終わりへ動かし、keys を打つ(userEvent.keyboard の書き方)
export const typeAtLineEnd = async (keys: string) => {
  await codeBox().click()
  await userEvent.keyboard(`{End}${keys}`)
}

// onChange が最後に受け取った状態
export const lastState = (onChange: OnChange): EditorState => {
  const call = onChange.mock.lastCall
  if (call === undefined) throw new Error('onChange がまだ一度も呼ばれていない')
  return call[0]
}

// onChange が最後に受け取った状態の文字(まだ呼ばれていなければ undefined。expect.poll で待つため投げない)
export const lastText = (onChange: OnChange): string | undefined => {
  const call = onChange.mock.lastCall
  return call === undefined ? undefined : docText(call[0])
}
