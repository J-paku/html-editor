// 失敗についての1つの短い知らせ(表示部品。フックを呼ばない)。利用者が閉じるか、新しい失敗が置き換えるまで残る
import type { NoticeKind, NoticeStrings } from '@content/types/strings'
import styles from './notice.module.css'

export type NoticeProps = {
  strings: NoticeStrings
  kind: NoticeKind
  onDismiss: () => void
}

function Notice({ strings, kind, onDismiss }: NoticeProps) {
  return (
    <div className={styles.notice} role='alert'>
      <p className={styles.message}>{strings.messages[kind]}</p>
      <button className={styles.dismiss} type='button' onClick={onDismiss}>
        {strings.dismiss}
      </button>
    </div>
  )
}

export default Notice
