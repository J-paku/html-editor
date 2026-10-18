// プロジェクトの1つの開き方に属する値(復元の問い、保存が衝突したファイル、保存中か、閉じている途中か)。それぞれを
// その開き方のopenId(./types.ts)と一緒に持つので、そのプロジェクトを閉じるか別のものを開くと画面から消える。
// 遅れて届いたとき(プロジェクトを閉じた後に来たIndexedDBやディスクの答え)も同じ
import type { Session } from './types'

export type ForOpening<T> = { openId: symbol; value: T }

// sessionの開き方のために持つvalue
export const forOpening = <T>(session: Session, value: T): ForOpening<T> => ({
  openId: session.openId,
  value,
})

// 持っている値。その開き方が今開いているものである間だけ。何も持っていない・何も開いていない・別の開き方が
// 開いているときはnull
export const valueForOpening = <T>(
  kept: ForOpening<T> | null,
  session: Session | null
): T | null =>
  kept !== null && session !== null && kept.openId === session.openId ? kept.value : null

// valueを置いた1歩が終わったときに持つもの。valueをまだ持っていれば何も持たない。その間に(別の開き方の1歩が)
// 置いたものなら、それを持ち続ける
export const dropKept = <T>(kept: T | null, value: T): T | null => (kept === value ? null : kept)
