import type { StartScreenStrings } from '@content/types/strings'
import styles from './start-screen.module.css'

export type StartScreenProps = {
  strings: StartScreenStrings
  isSupported: boolean
  onOpenFolder: () => void
  onOpenFile: () => void
}

function StartScreen({ strings, isSupported, onOpenFolder, onOpenFile }: StartScreenProps) {
  return (
    <section className={styles.screen} aria-label={strings.productName}>
      <div className={styles.content}>
        <svg className={styles.mark} viewBox='0 0 40 40' fill='none' aria-hidden='true'>
          <path d='m13 11-9 9 9 9M27 11l9 9-9 9M23 7l-6 26' strokeWidth='2.5' />
        </svg>
        <h1 className={styles.title}>{strings.productName}</h1>
        <p className={styles.description}>{strings.description}</p>
        <div className={styles.actions}>
          <button
            className={styles.primary}
            type='button'
            disabled={!isSupported}
            onClick={onOpenFolder}
          >
            {strings.openFolder}
          </button>
          <button
            className={styles.secondary}
            type='button'
            disabled={!isSupported}
            onClick={onOpenFile}
          >
            {strings.openFile}
          </button>
        </div>
        <p className={styles.note}>{strings.localNote}</p>
        {!isSupported && (
          <div className={styles.notice} role='status'>
            <h2>{strings.unsupportedTitle}</h2>
            <p>{strings.unsupportedDescription}</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default StartScreen
