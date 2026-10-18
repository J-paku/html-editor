// コード窓の CodeMirror の EditorView を、親が渡す文書の状態(EditorState)に合わせて保つ。
// 状態の持ち主は親(ファイルごとの状態を束ねる側)で、ここは見せることと、書き換えた状態を親へ返すことだけを持つ。
//   - 親が状態を差し替えたら(ファイルの切り替え・元に戻す・ディスクからの読み直し)、view をその状態に替える
//   - view の状態が変わったら(利用者の入力・カーソルの移動・構文の読み取りの進み)、新しい状態をそのまま親へ返す。
//     親がそれを渡し直してきたときは view の状態と同じなので、何もしない。
//     返す状態には文書の変わらないもの(カーソルの移動など)も混ざる。文書が変わったかは、前の状態と doc を比べて見る
// 外の世界には触れない
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

type EditorViewOptions = {
  state: EditorState
  onChange: (state: EditorState) => void
  label: string
}

// 返すのは、view を置く要素に渡す ref
export function useEditorView({ state, onChange, label }: EditorViewOptions) {
  const [view, setView] = useState<EditorView | null>(null)
  const onChangeRef = useRef(onChange)

  // view が返す先は、いつも最新の onChange にする(view は作り直さない)
  useLayoutEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // 置く要素が付いたら view を作り、外れたら壊す。最初の状態は仮の空の文書で、下の同期で親の状態に替える
  const attach = useCallback((host: HTMLDivElement) => {
    const created = new EditorView({
      parent: host,
      dispatchTransactions: (transactions, current) => {
        current.update(transactions)
        onChangeRef.current(current.state)
      },
    })
    setView(created)
    return () => created.destroy()
  }, [])

  // 親の状態を見せる。view が自分で返した状態が戻ってきただけなら替えない
  useLayoutEffect(() => {
    if (view === null || view.state === state) return
    view.setState(state)
  }, [view, state])

  // 書き込み欄(role=textbox の要素)の名前。CodeMirror は aria-label を扱わないので、要素へ直接付ける
  useLayoutEffect(() => {
    view?.contentDOM.setAttribute('aria-label', label)
  }, [view, label])

  return attach
}
