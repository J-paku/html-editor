// プレビューのsrcdoc。作り直すのはファイルの文字(か走らせるHTML)が変わったときだけで、入力の間はコードが少しの間
// 変わらずにいるまで待つ。そのためプレビューは、キーのたびに作り直されずにコードについてくる。カーソルの移動や
// 構文の読み取りの進みでは何も変わらない。新しく開いたプロジェクトはすぐに見せる(../utils/build-preview.ts)
import { useEffect, useMemo, useState } from 'react'
import { previewDelayOf, previewSessionOf, previewSrcdocOf } from '../utils/build-preview'
import type { Session } from '../utils/types'

// 何も開いていないか、プロジェクトに走らせるHTMLが無ければundefined
export function usePreviewSrcdoc(session: Session | null): string | undefined {
  // 最後にプレビューを作ったセッション
  const [settled, setSettled] = useState(session)

  useEffect(() => {
    const delay = previewDelayOf(settled, session)
    if (delay === null) return
    const timer = setTimeout(() => setSettled(session), delay)
    return () => clearTimeout(timer)
  }, [settled, session])

  const shown = previewSessionOf(settled, session)
  return useMemo(() => previewSrcdocOf(shown), [shown])
}
