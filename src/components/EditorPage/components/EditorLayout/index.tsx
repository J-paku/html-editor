import type { ReactNode } from 'react'
import type { EditorLayoutStrings } from '@content/types/strings'
import styles from './editor-layout.module.css'

export type EditorLayoutProps = {
  strings: EditorLayoutStrings
  toolbar: ReactNode
  fileList: ReactNode
  codeEditor: ReactNode
  preview: ReactNode
}

function EditorLayout({ strings, toolbar, fileList, codeEditor, preview }: EditorLayoutProps) {
  return (
    <div className={styles.layout}>
      <header className={styles.toolbar}>{toolbar}</header>
      <div className={styles.workspace}>
        <aside className={styles.files} aria-label={strings.files} tabIndex={0}>
          {fileList}
        </aside>
        <section className={styles.panel} aria-label={strings.code}>
          <h2 className={styles.heading}>{strings.code}</h2>
          <div className={styles.content}>{codeEditor}</div>
        </section>
        <section className={styles.panel} aria-label={strings.preview}>
          <h2 className={styles.heading}>{strings.preview}</h2>
          <div className={styles.content}>{preview}</div>
        </section>
      </div>
    </div>
  )
}

export default EditorLayout
