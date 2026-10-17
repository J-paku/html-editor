// 編集器の画面の統合テスト(__tests__/editor-pageの下の *.integration.test.tsx)へ渡すコンテナのpropsを、
// 入口(src/components/EditorPage/index.tsx)と同じ読み口(src/lib/content/read.ts)でnode側で組む。
// 読み口はserver-onlyで、ブラウザのテストからは読まない(vitest.integration.config.tsはserver-onlyを
// 中身の無い版へ向けるので、このnodeの側でだけ読める)。
// vitest.integration.config.tsのglobalSetupが __tests__ の下のcontainer.fixture.tsとしてこのファイルを拾い、nodeで走らせて
// provideし、テストはinjectで受け取る
import type { ComponentProps } from 'react'
import type { TestProject } from 'vitest/node'
import { readStrings } from '@/lib/content/read'
import type EditorPageContainer from '@/components/EditorPage/container'

export type EditorPageData = ComponentProps<typeof EditorPageContainer>

export const editorPageData = (): EditorPageData => ({ strings: readStrings() })

declare module 'vitest' {
  export interface ProvidedContext {
    editorPage: EditorPageData
  }
}

// globalSetupの入口。テストより先にnodeで1回だけ走る
export function setup(project: TestProject): void {
  project.provide('editorPage', editorPageData())
}
