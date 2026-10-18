'use client'

// コード窓(状態コンテナ)。親が渡す文書の状態(EditorState)を CodeMirror で見せ、利用者が書き換えた新しい状態を親へ返す。
// 文書の状態の作り方・読み方は ../../utils/doc-state.ts。外の世界には触れない(I/O コンテナの一覧に入れない)
import type { EditorState } from '@codemirror/state'
import { useEditorView } from './hooks/use-editor-view'
import styles from './code-editor.module.css'

type CodeEditorProps = {
  // 見せる文書の状態。ファイルの切り替え・元に戻す・ディスクからの読み直しで、親が差し替える
  state: EditorState
  // 状態が変わるたびに新しい状態を受け取る。受け取った状態を、次の state としてそのまま渡し直す
  onChange: (state: EditorState) => void
  // 書き込み欄(role=textbox)の名前
  label: string
}

function CodeEditor({ state, onChange, label }: CodeEditorProps) {
  const attach = useEditorView({ state, onChange, label })
  return <div ref={attach} className={styles.root} />
}

export default CodeEditor
