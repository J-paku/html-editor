import type { RestoreDialogStrings } from '@content/types/strings'
import styles from './restore-dialog.module.css'

export type RestoreDialogProps = {
  strings: RestoreDialogStrings
  open: boolean
  titleId: string
  filePaths: readonly string[]
  hasDiskChanges: boolean
  onRestore: () => void
  onDiscard: () => void
}

// 初めの焦点は復元(何も失わない選択。破棄すると下書きは戻らない)。data-initial-focusの付いた操作に、開いたときに
// ../../hooks/use-dialog-focus.tsが焦点を置く
function RestoreDialog({
  strings,
  open,
  titleId,
  filePaths,
  hasDiskChanges,
  onRestore,
  onDiscard,
}: RestoreDialogProps) {
  if (!open) return null

  return (
    <div className={styles.overlay}>
      <div
        className={styles.dialog}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-description`}
        tabIndex={-1}
      >
        <div className={styles.body}>
          <h2 id={titleId} className={styles.title}>
            {strings.title}
          </h2>
          <p id={`${titleId}-description`} className={styles.description}>
            {strings.description}
          </p>
          <div className={styles.paths} tabIndex={0} role='region' aria-label={strings.pathsLabel}>
            <ul>
              {filePaths.map(path => (
                <li key={path}>{path}</li>
              ))}
            </ul>
          </div>
          {hasDiskChanges && (
            <p className={styles.warning} role='status'>
              {strings.diskChangedWarning}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <button className={styles.discard} type='button' onClick={onDiscard}>
            {strings.discard}
          </button>
          <button className={styles.restore} type='button' data-initial-focus onClick={onRestore}>
            {strings.restore}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RestoreDialog
