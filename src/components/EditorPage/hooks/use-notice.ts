// 利用者に見せる、失敗についての1つの短い知らせ(components/Notice)。新しい失敗が古いものを置き換える
import { useCallback, useState } from 'react'
import type { NoticeKind } from '@content/types/strings'

// report(kind)は、kindの知らせを見せるハンドラを返す。そのまま.catch()に渡せる
export type Report = (kind: NoticeKind) => () => void

export function useNotice() {
  const [notice, setNotice] = useState<NoticeKind | null>(null)
  const report: Report = useCallback(kind => () => setNotice(kind), [])
  const dismiss = useCallback(() => setNotice(null), [])
  return { notice, report, dismiss }
}
