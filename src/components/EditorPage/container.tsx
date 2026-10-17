// 編集器の画面(I/Oコンテナ。一覧の正本はscripts/container-dirs.mjs)。
// 外の世界(ファイル・IndexedDBなど)に触れるimportと画面の状態のフックは、ここと隣のhooks/ にだけ置く(AGENTS.mdの不変ルール3)。
// 今は編集器の機能を作る前の土台で、題名だけを描く。フックを持たないので 'use client' を付けない
import type { Strings } from '@content/types/strings'
import styles from './editor-page.module.css'

type EditorPageContainerProps = {
  strings: Strings
}

function EditorPageContainer({ strings }: EditorPageContainerProps) {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{strings.title}</h1>
    </main>
  )
}

export default EditorPageContainer
