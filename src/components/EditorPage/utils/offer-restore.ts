// 開いたばかりのプロジェクトに、残してあった下書き(src/lib/store-draft.ts)のどれを戻すことを持ちかけられるかと、
// その問い(復元の問い)に答えが出るまでの様子
import type { Text } from '@codemirror/state'
import { isSameFingerprint } from '@/utils/compare-fingerprint'
import type { DraftEntry } from '@/utils/encode-draft'
import { isDirty } from './doc-state'
import { textFileOf } from './read-session'
import { forOpening, type ForOpening } from './tie-opening'
import type { Session, SessionFile, TextSessionFile } from './types'

export type RestoreOffer = {
  projectKey: string
  // パスの順(並べられたとおり)
  drafts: DraftEntry[]
  // 下書きを残した後に、ディスクで変わったファイルがある(下書きは別の版から作られた)
  hasDiskChanges: boolean
}

// プロジェクトがまだ持っている文字のファイルの下書き。同じ名前の2つのフォルダはプロジェクトのキーを共有するので、
// ディスクで変わったファイルの下書きも持ちかけ、hasDiskChangesを立てる。持ちかけるものが無ければnull
export const restoreOfferOf = (
  projectKey: string,
  files: readonly SessionFile[],
  drafts: readonly DraftEntry[]
): RestoreOffer | null => {
  const textFiles = new Map(
    files.flatMap(file => (file.kind === 'text' ? [[file.path, file] as const] : []))
  )
  const matches = drafts.flatMap(draft => {
    const file: TextSessionFile | undefined = textFiles.get(draft.path)
    return file === undefined ? [] : [{ draft, file }]
  })
  if (matches.length === 0) return null
  return {
    projectKey,
    drafts: matches.map(({ draft }) => draft),
    hasDiskChanges: matches.some(
      ({ draft, file }) => !isSameFingerprint(draft.openedFingerprint, file.fingerprint)
    ),
  }
}

// 1つの開き方の復元の問い。下書きが見つかってから、答えが出るまで
export type OfferState =
  // 尋ねている。dismissedは、Escapeで最後に問いを閉じたときの、offerの各ファイル(draftsと同じ順)の文字。
  // 問いが見えている間はnull。どれかの文字が変わると、問いはまた見える
  | { kind: 'asking'; offer: RestoreOffer; dismissed: readonly Text[] | null }
  // 破棄している。下書きを消し終えるまで、ファイルの下書きは書かずに待たせる
  | { kind: 'discarding'; offer: RestoreOffer }

// 開いたばかりのsessionで見つかった下書き(drafts)についての問い。持ちかけるものが無ければnull
export const offerStateOf = (
  session: Session,
  drafts: readonly DraftEntry[]
): ForOpening<OfferState> | null => {
  const offer = restoreOfferOf(session.projectKey, session.files, drafts)
  return offer === null ? null : forOpening(session, { kind: 'asking', offer, dismissed: null })
}

const textsOf = (offer: RestoreOffer, session: Session): Text[] =>
  offer.drafts.map(draft => textFileOf(session, draft.path).doc.doc)

// 見せる問い。尋ねていて、Escapeで閉じていないか、閉じた後にそのファイルのどれかの文字が変わったとき
// (カーソルの移動では文字は変わらない)。見せないときはnull
export const shownOfferOf = (
  state: OfferState | null,
  session: Session | null
): RestoreOffer | null => {
  if (state === null || session === null || state.kind !== 'asking') return null
  const { offer, dismissed } = state
  if (dismissed === null) return offer
  return textsOf(offer, session).some((text, index) => text !== dismissed[index]) ? offer : null
}

// Escapeで問いを閉じた後。何にも答えず、そのときのファイルの文字を覚える。
// sessionの開き方の問いを尋ねていなければ、そのまま
export const dismissedOf = (
  kept: ForOpening<OfferState> | null,
  session: Session | null
): ForOpening<OfferState> | null => {
  if (
    kept === null ||
    session === null ||
    kept.openId !== session.openId ||
    kept.value.kind !== 'asking'
  )
    return kept
  return forOpening(session, { ...kept.value, dismissed: textsOf(kept.value.offer, session) })
}

// 問いをもう一度見せた後。尋ねていなければ、そのまま
export const reaskedOf = (kept: ForOpening<OfferState> | null): ForOpening<OfferState> | null =>
  kept !== null && kept.value.kind === 'asking'
    ? { openId: kept.openId, value: { ...kept.value, dismissed: null } }
    : kept

// 問いに答えが出るまで、下書きを書き換えも消しもしないファイルのパス
export const heldPathsOf = (state: OfferState | null): ReadonlySet<string> =>
  new Set(state === null ? [] : state.offer.drafts.map(draft => draft.path))

// 尋ねている問いのファイルに、保存していない変更があるか。その変更は答えが出るまで下書きに残せないので、
// 閉じる前にもう一度尋ねる
export const hasAskedEdits = (state: OfferState | null, session: Session): boolean =>
  state !== null &&
  state.kind === 'asking' &&
  state.offer.drafts.some(draft => {
    const file = textFileOf(session, draft.path)
    return isDirty(file.doc, file.savedDoc)
  })
