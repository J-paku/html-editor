// 編集器の画面(コンテナ)が題名を描くかの統合テスト(Vitest Browser Mode)。画面を実際のChromiumで描き、
// contentの題名がページの見出し(h1)として利用者に見えることを確かめる。
// propsは入口(index.tsx)と同じ読み口でcontainer.fixture.tsがnodeで組み、injectで受け取る
import { cleanup, render } from '@testing-library/react'
import { inject } from 'vitest'
import { page } from 'vitest/browser'
import EditorPageContainer from '@/components/EditorPage/container'

afterEach(cleanup)

describe('題名', () => {
  it('content の題名を、ページの見出し(h1)として描く', async () => {
    const data = inject('editorPage')
    render(<EditorPageContainer {...data} />)

    await expect
      .element(page.getByRole('heading', { level: 1, name: data.strings.title }))
      .toBeVisible()
  })
})
