// 最初の画面へ戻る(道具の棚の「開く」)。待っている下書きを書き終えてから戻るので、開き直したときに持ちかけられる。
// 書くのを待つ間(closing)は、画面は入力を受けない(待つ間の編集が、書かれずに消えないように)。
// 書けなかったときは、保存していない変更が無ければそのまま戻る(残す変更が無い)。あれば戻らずに、理由とどうすれば
// 閉じられるかを知らせる。閉じた問いのファイルに保存していない変更があるときは、戻らずに問いをもう一度見せる
// (keepsEdits。./use-restore-offer.ts)
import { useEffect, useRef, useState, type Dispatch } from 'react'
import type { SessionAction } from '../utils/reduce-session'
import { isSessionDirty } from '../utils/read-session'
import { forOpening, valueForOpening, type ForOpening } from '../utils/tie-opening'
import type { Session } from '../utils/types'
import type { Report } from './use-notice'

// currentは今開いているセッション。flushは待っている下書きを書く(./use-draft-autosave.ts)
export function useCloseProject(
  current: Session | null,
  dispatch: Dispatch<SessionAction>,
  report: Report,
  flush: () => Promise<void>,
  keepsEdits: (session: Session) => boolean
) {
  const [closing, setClosing] = useState<ForOpening<true> | null>(null)
  const isClosing = valueForOpening(closing, current) !== null
  // 書き終えたときのセッション(待つ間に終わった保存も数える)
  const latest = useRef(current)
  useEffect(() => {
    latest.current = current
  })

  // 書くのは、入力を受けなくなった描画の後。それより前の編集は、もう待ちに入っている
  useEffect(() => {
    if (!isClosing) return
    flush().then(
      () => dispatch({ type: 'closed' }),
      () => {
        if (!isSessionDirty(latest.current)) {
          dispatch({ type: 'closed' })
          return
        }
        report('closeBlocked')()
        setClosing(null)
      }
    )
  }, [isClosing, flush, dispatch, report])

  const close = (session: Session) => {
    if (!keepsEdits(session)) setClosing(forOpening(session, true as const))
  }

  return { closing: isClosing, close }
}
