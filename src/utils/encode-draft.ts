// IndexedDBに残す、保存していない編集の形と、それを残すキー
import { fingerprintOf, isFileFingerprint, type FileFingerprint } from './compare-fingerprint'

// 残した1つの編集。どのプロジェクトのどのファイルか、開いたときのファイルの指紋、今の文字、
// 残した時刻(エポックからのミリ秒)
export type DraftEntry = {
  projectKey: string
  path: string
  openedFingerprint: FileFingerprint
  text: string
  savedAt: number
}

// 保存する形は版を持つ。形が変わったら、古い形で書いた記録は読み違えずに、読むときに捨てる
const DRAFT_VERSION = 1
export type DraftRecord = DraftEntry & { version: typeof DRAFT_VERSION }

// 開いた1つのフォルダかファイルの下書きをまとめるキー。ブラウザは選んだフォルダのパスも変わらないidもくれないので、
// キーは種類と名前だけで作る。同じ名前の別々のフォルダは1つのキーを共有するので、戻すことを持ちかける前に
// openedFingerprintをディスクのファイルと比べる
export const projectKeyOf = (project: { kind: 'folder' | 'file'; name: string }): string =>
  `${project.kind}:${project.name}`

// 1つの下書きのIndexedDBのキー。下書きはプロジェクトとパスごとに1つなので、もう一度残すと置き換わる
export const draftKeyOf = (projectKey: string, path: string): [string, string] => [projectKey, path]

// IndexedDBのキーがそのプロジェクトのものか。キーだけを見るので、値が壊れた記録も見つかる(そして消せる)
export const isDraftKeyOf = (key: IDBValidKey, projectKey: string): boolean =>
  Array.isArray(key) && key[0] === projectKey

// 項目を1つずつ写すので、呼ぶ側のオブジェクトが持つほかのもの(たとえばファイルのハンドル)は
// IndexedDBに書かれない
export const toDraftRecord = (entry: DraftEntry): DraftRecord => ({
  version: DRAFT_VERSION,
  projectKey: entry.projectKey,
  path: entry.path,
  openedFingerprint: fingerprintOf(entry.openedFingerprint),
  text: entry.text,
  savedAt: entry.savedAt,
})

export const isDraftRecord = (value: unknown): value is DraftRecord => {
  const record = (value ?? {}) as Partial<Record<keyof DraftRecord, unknown>>
  return (
    record.version === DRAFT_VERSION &&
    typeof record.projectKey === 'string' &&
    typeof record.path === 'string' &&
    typeof record.text === 'string' &&
    Number.isFinite(record.savedAt) &&
    isFileFingerprint(record.openedFingerprint)
  )
}

export const fromDraftRecord = (record: DraftRecord): DraftEntry => ({
  projectKey: record.projectKey,
  path: record.path,
  openedFingerprint: fingerprintOf(record.openedFingerprint),
  text: record.text,
  savedAt: record.savedAt,
})
