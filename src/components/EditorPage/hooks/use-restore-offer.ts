// 前回、保存せずに編集したときにプロジェクトがIndexedDBに残した下書きを、戻すことを持ちかける(復元の問い)。
// 復元すると下書きの文字がファイルに入り(まだ保存していない)、破棄するとプロジェクトの下書きを全部消す。
// Escapeは問いを閉じるだけで、どちらにも答えない(下書きはそのまま)。閉じた後に問いのファイルの文字を変え始めると、
// 問いをまた見せる。答えが出るまで(破棄なら消し終えるまで)、問いのファイルの下書きは書き換えも消しもしない(held)。
// 問いは、それを持ちかけた開き方のもの(../utils/tie-opening.ts)。プロジェクトを閉じるか別のものを開くと画面から消え、
// 前の開き方のために遅れて届いた答えは捨てる
import { useMemo, useRef, useState, type Dispatch } from 'react'
import { clearDrafts, listDrafts } from '@/lib/store-draft'
import {
  dismissedOf,
  hasAskedEdits,
  heldPathsOf,
  offerStateOf,
  reaskedOf,
  shownOfferOf,
  type OfferState,
  type RestoreOffer,
} from '../utils/offer-restore'
import type { SessionAction } from '../utils/reduce-session'
import { dropKept, forOpening, valueForOpening, type ForOpening } from '../utils/tie-opening'
import type { Session } from '../utils/types'
import { useEscapeKey } from './use-escape-key'
import type { Report } from './use-notice'

// currentは今開いているセッション(最初の画面ではnull)
export function useRestoreOffer(
  current: Session | null,
  dispatch: Dispatch<SessionAction>,
  report: Report
) {
  const [kept, setKept] = useState<ForOpening<OfferState> | null>(null)
  // 最後に下書きを探した開き方。それより前の開き方への答えは遅すぎるので捨てる
  const latest = useRef<symbol | null>(null)
  const state = valueForOpening(kept, current)
  const offer = shownOfferOf(state, current)
  const held = useMemo(() => heldPathsOf(state), [state])

  // 開いたばかりのセッションの下書きを探す。読めなければ、問いを出さずにプロジェクトを開いたままにする
  const check = (opened: Session) => {
    latest.current = opened.openId
    listDrafts(opened.projectKey).then(drafts => {
      if (latest.current === opened.openId) setKept(offerStateOf(opened, drafts))
    }, report('draftFailed'))
  }

  const restore = (shown: RestoreOffer) => {
    dispatch({ type: 'restored', drafts: shown.drafts })
    setKept(null)
  }

  // 消し終えるまでは破棄している最中として、問いのファイルの下書きを書かずに待たせる
  // (消している間に書いた下書きまで消さないように)
  const discard = (session: Session, shown: RestoreOffer) => {
    const discarding = forOpening<OfferState>(session, { kind: 'discarding', offer: shown })
    setKept(discarding)
    clearDrafts(shown.projectKey)
      .catch(report('draftFailed'))
      .finally(() => setKept(previous => dropKept(previous, discarding)))
  }

  // プロジェクトを閉じる前に呼ぶ。閉じた問いのファイルに保存していない変更があれば、その変更は下書きに残せないので、
  // 閉じずに問いをもう一度見せる。見せたかを返す
  const keepsEdits = (session: Session) => {
    if (!hasAskedEdits(state, session)) return false
    setKept(reaskedOf)
    return true
  }

  useEscapeKey(offer !== null, () => setKept(previous => dismissedOf(previous, current)))

  return { offer, held, check, restore, discard, keepsEdits }
}
