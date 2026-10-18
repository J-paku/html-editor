// 編集したファイルの文字をIndexedDBに残し、保存せずにページが閉じた後で戻すことを持ちかけられるようにする。
// 書くのは、文字か保存した時点の文字が変わったファイルだけ(../utils/plan-drafts.ts)。変わってから少しの間、次の変更が
// 無ければまとめて書き、そのときのセッションから読む。カーソルの移動・選択だけでは書く予定を立てない。
// ページが見えなくなると(離れる・タブが隠れる)、待っている分をすぐに書く。
// held(復元の問いに答えが出るまでのファイル)の下書きは書き換えも消しもせず、待たせておいて、外れた後に書く。
// 返すflushは、待っている分をすぐに書き、書き終えたら落ち着く(プロジェクトを閉じる前)
import { useCallback, useEffect, useRef } from 'react'
import { deleteDraft, saveDraft } from '@/lib/store-draft'
import {
  changedDraftsOf,
  draftWritesOf,
  isLeavingSight,
  pendingAfterWrites,
  pendingWithChanges,
  writablePending,
  type DraftWrite,
  type PendingDraft,
} from '../utils/plan-drafts'
import type { Session } from '../utils/types'
import type { Report } from './use-notice'

const DRAFT_DELAY_MS = 500

const runWrite = (write: DraftWrite): Promise<void> =>
  write.kind === 'save' ? saveDraft(write.draft) : deleteDraft(write.projectKey, write.path)

export function useDraftAutosave(
  session: Session | null,
  report: Report,
  held: ReadonlySet<string>
) {
  // 下のeffectを最後に走らせた描画のセッション(何が変わったかを見つけるのと、書くときに読むため)
  const seen = useRef(session)
  const pending = useRef<PendingDraft[]>([])
  const heldNow = useRef(held)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // 書き終えるまで、ファイルは待ちに残る。書くのに失敗したらflushはrejectし、次のflushがそのファイルをもう一度試す。
  // 別のflushが書いている間のflushは同じファイルをもう一度書くので、それの終わりも待つ。
  // すぐに書くので、予定していた書き込みは取り消す(同じものを後でもう一度書いて、失敗をもう一度知らせないように)
  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const taken = writablePending(pending.current, heldNow.current)
    await Promise.all(draftWritesOf(seen.current, taken).map(runWrite))
    pending.current = pendingAfterWrites(pending.current, taken)
  }, [])

  // 少しの間を置いて書く。前の予定は取り消すので、変更が続く間は先へ延びる
  const schedule = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      flush().catch(report('draftFailed'))
    }, DRAFT_DELAY_MS)
  }, [flush, report])

  useEffect(() => {
    const changed = changedDraftsOf(seen.current, session)
    pending.current = pendingWithChanges(pending.current, changed, session?.openId ?? null)
    seen.current = session
    if (changed.length > 0) schedule()
  }, [session, schedule])

  // 問いから外れたファイルの待っていた分は、ここで書く予定を立てる
  useEffect(() => {
    heldNow.current = held
    if (writablePending(pending.current, held).length > 0) schedule()
  }, [held, schedule])

  // 画面が消えたら、予定していた書き込みを取り消す
  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    const onHide = (event: Event) => {
      if (isLeavingSight(event.type, document.visibilityState)) flush().catch(report('draftFailed'))
    }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [flush, report])

  return flush
}
