import type { ConflictDialogStrings } from '@content/types/strings'
import styles from './conflict-dialog.module.css'

export type ConflictDialogProps = {
  strings: ConflictDialogStrings
  open: boolean
  titleId: string
  filePath: string
  onOverwrite: () => void
  onLoadDisk: () => void
  onCancel: () => void
}

// 初めの焦点はキャンセル(何も失わない選択)。data-initial-focusの付いた操作に、開いたときに
// ../../hooks/use-dialog-focus.tsが焦点を置く
function ConflictDialog({
  strings,
  open,
  titleId,
  filePath,
  onOverwrite,
  onLoadDisk,
  onCancel,
}: ConflictDialogProps) {
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
          <p className={styles.path}>{filePath}</p>
          <p id={`${titleId}-warning`} className={styles.warning}>
            {strings.discardWarning}
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.overwrite} type='button' onClick={onOverwrite}>
            {strings.overwrite}
          </button>
          <button
            className={styles.button}
            type='button'
            aria-describedby={`${titleId}-warning`}
            onClick={onLoadDisk}
          >
            {strings.loadDisk}
          </button>
          <button className={styles.cancel} type='button' data-initial-focus onClick={onCancel}>
            {strings.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConflictDialog
