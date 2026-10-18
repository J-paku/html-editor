// フォルダかファイルを1つ開く。選び、全部のファイルを読み、それでセッションを始める。
// 選ばずに選ぶ窓を閉じたときは何も言わない。選ぶ窓や読むのに失敗したときと、文字のファイルが1つも無いプロジェクトは、
// 知らせて、画面をそのままにする
import type { Dispatch } from 'react'
import { openFolder, openSingleFile, type OpenedProject } from '@/lib/open-project'
import { readProjectFiles } from '@/lib/read-project'
import { projectKeyOf } from '@/utils/encode-draft'
import { toSessionFile } from '../utils/load-file'
import type { SessionAction } from '../utils/reduce-session'
import { openSession } from '../utils/start-session'
import type { Session } from '../utils/types'
import type { Report } from './use-notice'

export function useOpenProject(
  dispatch: Dispatch<SessionAction>,
  report: Report,
  // 開いたばかりのセッションで呼ぶ(その下書きを探すため)
  onOpened: (session: Session) => void
) {
  const open = async (pick: () => Promise<OpenedProject | null>) => {
    try {
      const project = await pick()
      if (project === null) return
      const files = await Promise.all((await readProjectFiles(project)).map(toSessionFile))
      const session = openSession(project.name, projectKeyOf(project), files)
      if (session === null) {
        report('noTextFile')()
        return
      }
      dispatch({ type: 'opened', session })
      onOpened(session)
    } catch {
      report('openFailed')()
    }
  }

  return {
    openFolder: () => open(openFolder),
    openFile: () => open(openSingleFile),
  }
}
