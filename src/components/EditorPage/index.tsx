// 編集器の画面の入口(サーバのローダー)。contentの読み出し(サーバ専用)だけを行い、
// 直列化できるデータを画面(./container)へ渡す。画面の組み立てはコンテナが持つ
import { readStrings } from '@/lib/content/read'
import EditorPageContainer from './container'

function EditorPage() {
  return <EditorPageContainer strings={readStrings()} />
}

export default EditorPage
