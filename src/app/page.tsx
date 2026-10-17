// 入口の経路(配信では /html-editor/)。経路の定義だけを持ち、画面はローダー(EditorPage/index.tsx)が描く
import EditorPage from '@/components/EditorPage'

export default function Page() {
  return <EditorPage />
}
