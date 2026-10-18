import type { FileListStrings } from '@content/types/strings'
import styles from './file-list.module.css'

export type FileListItem = {
  path: string
  isText: boolean
  hasUnsavedChanges: boolean
}

export type FileListProps = {
  strings: FileListStrings
  files: readonly FileListItem[]
  activePath: string | null
  onSelect: (path: string) => void
}

function FileList({ strings, files, activePath, onSelect }: FileListProps) {
  return (
    <nav className={styles.files} aria-label={strings.title}>
      <h2 className={styles.heading}>{strings.title}</h2>
      {files.length === 0 ? (
        <p className={styles.empty}>{strings.empty}</p>
      ) : (
        <ul className={styles.list}>
          {files.map(file => (
            <li key={file.path}>
              <button
                className={styles.file}
                type='button'
                aria-current={file.path === activePath ? 'page' : undefined}
                disabled={!file.isText}
                onClick={() => onSelect(file.path)}
                title={file.path}
              >
                <svg className={styles.icon} viewBox='0 0 16 20' fill='none' aria-hidden='true'>
                  <path d='M2 1h7l5 5v13H2V1Zm7 0v5h5M5 10h6M5 14h6' />
                </svg>
                <span className={styles.path}>{file.path}</span>
                {!file.isText && (
                  <span className={styles.visuallyHidden}>{strings.notEditable}</span>
                )}
                {file.hasUnsavedChanges && (
                  <span className={styles.dirty}>
                    <span className={styles.visuallyHidden}>{strings.unsaved}</span>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}

export default FileList
