// 編集の後にIndexedDB(src/lib/store-draft.ts)へ何を残すか。どのファイルの下書きが変わり得るかと、後でその時点の
// セッションを読んで、各下書きを書くか消すか
import type { Text } from '@codemirror/state'
import type { DraftInput } from '@/lib/store-draft'
import { docText, isDirty } from './doc-state'
import { baseFingerprintOf } from './read-session'
import type { Session, TextSessionFile } from './types'

// 1つの開き方の中で下書きが変わり得るファイル。書かれるのを待っている
export type PendingDraft = { openId: symbol; path: string }

export type DraftWrite =
  { kind: 'save'; draft: DraftInput } | { kind: 'delete'; projectKey: string; path: string }

const textFilesOf = (session: Session): TextSessionFile[] =>
  session.files.filter((file): file is TextSessionFile => file.kind === 'text')

const textMapOf = (session: Session, pick: (file: TextSessionFile) => Text): Map<string, Text> =>
  new Map(textFilesOf(session).map(file => [file.path, pick(file)] as const))

// previousからnextで、下書きが変わり得る文字のファイル。文字が変わった(入力・元に戻す・復元・読み直し)か、
// 保存した時点の文字が変わった(保存・読み直し)もの。保存した後は、書く前に作られた古い下書きを後から消すために数える。
// 1つの開き方の中だけを見る(プロジェクトを開く・閉じるのは変更ではない)。文字の同じ新しい状態(カーソルの移動・選択)は数えない
export const changedDraftsOf = (previous: Session | null, next: Session | null): PendingDraft[] => {
  if (previous === null || next === null || previous.openId !== next.openId) return []
  const docs = textMapOf(previous, file => file.doc.doc)
  const saved = textMapOf(previous, file => file.savedDoc)
  return textFilesOf(next)
    .filter(file => docs.get(file.path) !== file.doc.doc || saved.get(file.path) !== file.savedDoc)
    .map(file => ({ openId: next.openId, path: file.path }))
}

// 待っている下書きにchanged(今の開き方openIdのもの)を足す。ファイルごとに1件で、いちばん新しいものだけを持つ
// (同じファイルの前の項目は新しい項目に置き換わるので、その前の項目を書いている途中なら、新しい項目は自分の書き込みを待つ)。
// ほかの開き方の項目は捨てる(書かれることは無い)。何も開いていなければ(openIdがnull)何も待たない
export const pendingWithChanges = (
  pending: readonly PendingDraft[],
  changed: readonly PendingDraft[],
  openId: symbol | null
): PendingDraft[] => {
  const paths = new Set(changed.map(entry => entry.path))
  return [...pending.filter(entry => entry.openId === openId && !paths.has(entry.path)), ...changed]
}

// 今書いてよい待ちの項目。held(復元の問いに答えが出るまで、下書きを書き換えも消しもしないファイルのパス)を除く。
// 除いた項目は待ちに残り、問いに答えが出た後に書かれる
export const writablePending = (
  pending: readonly PendingDraft[],
  held: ReadonlySet<string>
): PendingDraft[] => pending.filter(entry => !held.has(entry.path))

// writtenの書き込みが終わった後に残る待ちの項目。その間に足された項目(同じファイルがまた変わったなら、それは新しい項目で、
// 自分の書き込みを待つ)。書き込みに失敗したら何も取り除かず、次に書くときにもう一度試す
export const pendingAfterWrites = (
  pending: readonly PendingDraft[],
  written: readonly PendingDraft[]
): PendingDraft[] => pending.filter(entry => !written.includes(entry))

// typeのイベントが、ページが見えなくなることを知らせるか。そうなら待っている下書きを間を置かずにすぐ書く。
// ページを離れる(pagehide)か、タブが隠れた(visibilityがhiddenのときのvisibilitychange。隠れたタブは、
// ほかのイベント無しに閉じられたり捨てられたりすることがある)
export const isLeavingSight = (type: string, visibility: DocumentVisibilityState): boolean =>
  type === 'pagehide' || visibility === 'hidden'

// 待っている下書きの書き込み。今のsessionから読む。保存した時点の文字とまだ違うファイルは今の文字を残し、
// それに戻ったファイル(保存した・元に戻した・ディスクから読み直した)は下書きを消す。各ファイルを1回ずつ、
// セッションの順に書く。ほかの開き方の項目と、何も開いていないときの項目は入れない
export const draftWritesOf = (
  session: Session | null,
  pending: readonly PendingDraft[]
): DraftWrite[] => {
  if (session === null) return []
  const paths = new Set(
    pending.filter(entry => entry.openId === session.openId).map(entry => entry.path)
  )
  const { projectKey } = session
  return textFilesOf(session).flatMap((file): DraftWrite[] => {
    if (!paths.has(file.path)) return []
    return isDirty(file.doc, file.savedDoc)
      ? [
          {
            kind: 'save',
            draft: {
              projectKey,
              path: file.path,
              openedFingerprint: baseFingerprintOf(file),
              text: docText(file.doc),
            },
          },
        ]
      : [{ kind: 'delete', projectKey, path: file.path }]
  })
}
