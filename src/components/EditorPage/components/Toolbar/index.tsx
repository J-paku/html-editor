import type { ToolbarStrings } from '@content/types/strings'
import styles from './toolbar.module.css'

export type ToolbarProps = {
  strings: ToolbarStrings
  projectName: string
  hasUnsavedChanges: boolean
  openDisabled: boolean
  saveDisabled: boolean
  undoDisabled: boolean
  redoDisabled: boolean
  presentDisabled: boolean
  modeDisabled: boolean
  mode: 'edit' | 'interact'
  onOpen: () => void
  onSave: () => void
  onUndo: () => void
  onRedo: () => void
  onPresent: () => void
  onModeChange: (mode: 'edit' | 'interact') => void
}

function Toolbar({
  strings,
  projectName,
  hasUnsavedChanges,
  openDisabled,
  saveDisabled,
  undoDisabled,
  redoDisabled,
  presentDisabled,
  modeDisabled,
  mode,
  onOpen,
  onSave,
  onUndo,
  onRedo,
  onPresent,
  onModeChange,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar} role='group' aria-label={strings.label}>
      <div className={styles.project}>
        <h1 className={styles.name} title={projectName}>
          {projectName}
        </h1>
        <span className={styles.status} role='status'>
          {hasUnsavedChanges && <span className={styles.unsaved}>{strings.unsaved}</span>}
        </span>
      </div>
      <div className={styles.actions}>
        <button className={styles.button} type='button' disabled={openDisabled} onClick={onOpen}>
          <svg viewBox='0 0 20 20' fill='none' aria-hidden='true'>
            <path d='M2 16V4h6l2 3h8v9H2Z' />
          </svg>
          {strings.open}
        </button>
        <button className={styles.save} type='button' disabled={saveDisabled} onClick={onSave}>
          <svg viewBox='0 0 20 20' fill='none' aria-hidden='true'>
            <path d='M10 2v10m-4-4 4 4 4-4M3 12v5h14v-5' />
          </svg>
          {strings.save}
        </button>
        <div className={styles.history}>
          <button
            className={styles.iconButton}
            type='button'
            aria-label={strings.undo}
            title={strings.undo}
            disabled={undoDisabled}
            onClick={onUndo}
          >
            <svg viewBox='0 0 20 20' fill='none' aria-hidden='true'>
              <path d='m7 3-4 4 4 4M3 7h9a5 5 0 0 1 0 10H9' />
            </svg>
          </button>
          <button
            className={styles.iconButton}
            type='button'
            aria-label={strings.redo}
            title={strings.redo}
            disabled={redoDisabled}
            onClick={onRedo}
          >
            <svg viewBox='0 0 20 20' fill='none' aria-hidden='true'>
              <path d='m13 3 4 4-4 4M17 7H8a5 5 0 0 0 0 10h3' />
            </svg>
          </button>
        </div>
      </div>
      <div
        className={styles.modes}
        role='group'
        aria-label={strings.modeLabel}
        title={modeDisabled ? strings.modeUnavailable : undefined}
      >
        <button
          className={styles.mode}
          type='button'
          aria-pressed={mode === 'edit'}
          disabled={modeDisabled}
          onClick={() => onModeChange('edit')}
        >
          {strings.editMode}
        </button>
        <button
          className={styles.mode}
          type='button'
          aria-pressed={mode === 'interact'}
          disabled={modeDisabled}
          onClick={() => onModeChange('interact')}
        >
          {strings.interactMode}
        </button>
      </div>
      <button
        className={styles.button}
        type='button'
        disabled={presentDisabled}
        onClick={onPresent}
      >
        <svg viewBox='0 0 20 20' fill='none' aria-hidden='true'>
          <path d='M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4' />
        </svg>
        {strings.present}
      </button>
    </div>
  )
}

export default Toolbar
