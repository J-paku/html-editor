// セッション(./types.ts)のすべての変化。useReducerのreducer。nullは最初の画面(何も開いていない)。
// 1つの開き方の中で、ファイルは順と種類を保つ。変わるのは文字のファイルだけ
import type { EditorState } from '@codemirror/state'
import type { FileFingerprint } from '@/utils/compare-fingerprint'
import type { DraftEntry } from '@/utils/encode-draft'
import { redoDoc, restoreDoc, savedDocOf, undoDoc } from './doc-state'
import type { Session, TextSessionFile } from './types'

export type SessionAction =
  // プロジェクトを読んだ(セッションは./start-session.tsが作る)
  | { type: 'opened'; session: Session }
  // 最初の画面へ戻る
  | { type: 'closed' }
  // 別の文字のファイルをコード窓に出す
  | { type: 'selected'; path: string }
  // コード窓が、pathのファイルの新しい状態を返した(入力だけでなく、カーソルの移動でも)
  | { type: 'edited'; path: string; doc: EditorState }
  // コード窓に出しているファイルで、元に戻す・やり直す
  | { type: 'undone' }
  | { type: 'redone' }
  // pathのファイルにtextを書き、ディスクのファイルの指紋がfingerprintになった。変わるのは保存した時点の文書だけで、
  // コード窓は見せている状態のまま
  | { type: 'saved'; openId: symbol; path: string; text: string; fingerprint: FileFingerprint }
  // 編集中のファイルをディスクの版で置き換える(その変更は捨てる)
  | { type: 'reloaded'; openId: symbol; file: TextSessionFile }
  // 残してあった下書きが、そのファイルの文字になる。保存した文字はディスクの文字のままなので、保存していない扱いで見える。
  // 各ファイルの文字は下書きの出どころ(下書きを作ったときの版)を持つ(./doc-state.tsのrestoreDoc)。
  // そのため保存は、その版から変わったディスクを見つけて先に尋ねる(./read-session.tsのbaseFingerprintOf)
  | { type: 'restored'; drafts: readonly DraftEntry[] }

// pathの文字のファイルをupdateが返すものに置き換えたセッション。バイナリのファイルとほかのパスはそのまま
const updateText = (
  session: Session,
  path: string,
  update: (file: TextSessionFile) => TextSessionFile
): Session => ({
  ...session,
  files: session.files.map(file =>
    file.kind === 'text' && file.path === path ? update(file) : file
  ),
})

type OpenAction = Exclude<SessionAction, { type: 'opened' | 'closed' }>

const applyToOpen = (session: Session, action: OpenAction): Session => {
  switch (action.type) {
    case 'selected':
      return session.files.some(file => file.kind === 'text' && file.path === action.path)
        ? { ...session, activePath: action.path }
        : session
    case 'edited':
      return updateText(session, action.path, file => ({ ...file, doc: action.doc }))
    case 'undone':
      return updateText(session, session.activePath, file => ({ ...file, doc: undoDoc(file.doc) }))
    case 'redone':
      return updateText(session, session.activePath, file => ({ ...file, doc: redoDoc(file.doc) }))
    case 'saved':
      return updateText(session, action.path, file => ({
        ...file,
        savedDoc: savedDocOf(file.doc, action.text),
        fingerprint: action.fingerprint,
      }))
    case 'reloaded':
      return updateText(session, action.file.path, () => action.file)
    case 'restored':
      return action.drafts.reduce(
        (next, draft) =>
          updateText(next, draft.path, file => ({
            ...file,
            doc: restoreDoc(file.doc, draft.text, {
              draft: draft.openedFingerprint,
              disk: file.fingerprint,
            }),
          })),
        session
      )
  }
}

// openIdを持つ動作(保存と読み直し)は、ディスクを待つ間に別のプロジェクトが開かれることがある。
// その動作を始めた開き方(openId)が今と同じときだけ当てる。違えば何も変えない
export const reduceSession = (state: Session | null, action: SessionAction): Session | null => {
  if (action.type === 'opened') return action.session
  if (action.type === 'closed' || state === null) return null
  if ('openId' in action && action.openId !== state.openId) return state
  return applyToOpen(state, action)
}
