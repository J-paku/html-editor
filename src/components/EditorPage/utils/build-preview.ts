// プレビューが走らせるもの。セッションのHTMLのsrcdoc(src/utils/preview-build-srcdoc.ts)を、全部の文字のファイルの
// 今の文字(保存していない編集も見える)と、全部のバイナリのファイルのバイトから作る
import { buildPreviewSrcdoc, type PreviewFile } from '@/utils/preview-build-srcdoc'
import { docText } from './doc-state'
import { isHtmlPath, startHtmlOf, textPathsOf } from './start-session'
import type { Session, SessionFile } from './types'

// プレビューを作り直す前に、コードが変わらずにいなければならない時間
export const PREVIEW_DELAY_MS = 300

// プレビューが走らせるHTML。コード窓のファイルがHTMLならそれ、そうでなければ最初のHTML。
// プロジェクトに文字のHTMLのファイルが無ければ空のパス。どのファイルもそのパスを持たないので、buildPreviewSrcdocはundefinedを返す
export const previewEntryOf = (session: Session): string =>
  isHtmlPath(session.activePath)
    ? session.activePath
    : (startHtmlOf(textPathsOf(session.files)) ?? '')

export const previewFilesOf = (session: Session): PreviewFile[] =>
  session.files.map(file => ({
    path: file.path,
    content: file.kind === 'text' ? docText(file.doc) : file.bytes,
  }))

// 何も開いていないか、走らせるHTMLが無ければundefined
export const previewSrcdocOf = (session: Session | null): string | undefined =>
  session === null
    ? undefined
    : buildPreviewSrcdoc(previewFilesOf(session), previewEntryOf(session))

// プレビューが見せるセッション。1つの開き方を編集している間は落ち着いたもの(少しの間変わらなかった最後のもの)で、
// 入力のたびにプレビューを作り直さない。別のプロジェクトを開いた直後や、プロジェクトを閉じた直後は、すぐに今のもの
export const previewSessionOf = (
  settled: Session | null,
  current: Session | null
): Session | null =>
  settled !== null && current !== null && settled.openId === current.openId ? settled : current

// プレビューにとって同じ中身か。文字のファイルなら同じ文字(状態はカーソルの移動の後のように違ってよい)、
// そうでなければ同じファイル(バイナリのファイルは1つの開き方の中で置き換わらない)
const isSameContent = (file: SessionFile, other: SessionFile): boolean =>
  file.kind === 'text' && other.kind === 'text' ? file.doc.doc.eq(other.doc.doc) : file === other

// aとbが同じプレビューになるか。どちらも何も開いていないか、同じ開き方で同じHTMLを走らせ、全部のファイルの中身が同じ。
// カーソルの移動や構文の読み取りの進みは、同じプレビューになる新しいセッションを作る
export const isSamePreview = (a: Session | null, b: Session | null): boolean =>
  a === null || b === null
    ? a === b
    : a.openId === b.openId &&
      previewEntryOf(a) === previewEntryOf(b) &&
      a.files.length === b.files.length &&
      a.files.every((file, index) => isSameContent(file, b.files[index]))

// settled(プレビューを作ったセッション)から見て、currentに落ち着くまで待つ時間。作るものが無ければ(currentが
// 同じプレビューになる)null。1つの開き方の中では入力が止まるのを待ち、別の開き方や閉じたときはすぐに落ち着く
// (プレビューはもうそれを見せている。previewSessionOfを参照)
export const previewDelayOf = (settled: Session | null, current: Session | null): number | null => {
  if (isSamePreview(settled, current)) return null
  return settled?.openId === current?.openId ? PREVIEW_DELAY_MS : 0
}
