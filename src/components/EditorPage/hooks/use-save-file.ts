// コード窓のファイルを保存することと、読んだ後にディスクでファイルが変わっていたときの選択
// (自分の内容で上書き・ディスクの版を読む・キャンセル。Escapeもキャンセル)。書いた・読み直したファイルの下書きは、
// 保存した時点の文字が変わったのを見て、下書きの自動保存(./use-draft-autosave.ts)が消す。
// 保存の動作・問い・保存中かは、それを始めた開き方のもの(../utils/tie-opening.ts)。プロジェクトを閉じるか別のものを
// 開いた後にディスクが答えても、今の開き方の文字・問い・保存のボタンは変えない
import { useState, type Dispatch } from 'react'
import type { NoticeKind } from '@content/types/strings'
import { readFingerprint, readProjectFile } from '@/lib/read-project'
import { ensureWritePermission } from '@/lib/request-permission'
import { writeFileContent } from '@/lib/write-file'
import { isUnchangedOnDisk } from '../utils/check-disk'
import { docText } from '../utils/doc-state'
import { toTextSessionFile } from '../utils/load-file'
import { activeFileOf, baseFingerprintOf, textFileOf } from '../utils/read-session'
import type { SessionAction } from '../utils/reduce-session'
import { dropKept, forOpening, valueForOpening, type ForOpening } from '../utils/tie-opening'
import type { Session, TextSessionFile } from '../utils/types'
import { useEscapeKey } from './use-escape-key'
import type { Report } from './use-notice'

// currentは今開いているセッション(最初の画面ではnull)
export function useSaveFile(
  current: Session | null,
  dispatch: Dispatch<SessionAction>,
  report: Report
) {
  // 1歩が走る間は保存のボタンを切るので、1回のクリックで1回だけ書く
  const [saving, setSaving] = useState<ForOpening<true> | null>(null)
  // ディスクの版が変わっていたファイル。衝突の問いが何をするか尋ねている間
  const [conflict, setConflict] = useState<ForOpening<string> | null>(null)
  const conflictPath = valueForOpening(conflict, current)

  // sessionの1歩を走らせる。途中の失敗はkindとして知らせる
  const run = async (session: Session, kind: NoticeKind, step: () => Promise<void>) => {
    const mine = forOpening(session, true as const)
    setSaving(mine)
    try {
      await step()
    } catch {
      report(kind)()
    } finally {
      setSaving(previous => dropKept(previous, mine))
    }
  }

  // fileの今の文字をそのまま書き、保存した文字として記録する
  const write = async (session: Session, file: TextSessionFile) => {
    const text = docText(file.doc)
    const fingerprint = await writeFileContent(file.handle, text)
    dispatch({ type: 'saved', openId: session.openId, path: file.path, text, fingerprint })
  }

  // 書く許可を求めてから(ブラウザが落としていることがある)、ディスクがまだ今の文字のもとの版のときだけ書く。
  // そうでなければ衝突の問いを開く
  const save = (session: Session) =>
    run(session, 'writeFailed', async () => {
      const file = activeFileOf(session)
      if (!(await ensureWritePermission(file.handle))) {
        report('permissionDenied')()
        return
      }
      if (isUnchangedOnDisk(await readFingerprint(file.handle), baseFingerprintOf(file))) {
        await write(session, file)
      } else {
        setConflict(forOpening(session, file.path))
      }
    })

  const overwrite = (session: Session, path: string) => {
    setConflict(null)
    return run(session, 'writeFailed', () => write(session, textFileOf(session, path)))
  }

  // ディスクの版で、ファイルとその保存していない変更を置き換える
  const loadDisk = (session: Session, path: string) => {
    setConflict(null)
    return run(session, 'readFailed', async () => {
      const file = textFileOf(session, path)
      dispatch({
        type: 'reloaded',
        openId: session.openId,
        file: toTextSessionFile(await readProjectFile(file.handle, path)),
      })
    })
  }

  const cancel = () => setConflict(null)
  useEscapeKey(conflictPath !== null, cancel)

  return {
    saving: valueForOpening(saving, current) !== null,
    conflictPath,
    save,
    overwrite,
    loadDisk,
    cancel,
  }
}
