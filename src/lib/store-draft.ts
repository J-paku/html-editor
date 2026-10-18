// 保存していない編集をIndexedDBに残し、同じプロジェクトをまた開いたときに戻せるようにする。
// IndexedDBが使えないと、どの関数もrejectする。何を見せるかは呼ぶ側が決める
import { createStore, del, delMany, keys, set, values } from 'idb-keyval'
import {
  draftKeyOf,
  fromDraftRecord,
  isDraftKeyOf,
  isDraftRecord,
  toDraftRecord,
  type DraftEntry,
} from '@/utils/encode-draft'
import { comparePaths } from '@/utils/resolve-path'

// 呼ぶ側が渡すもの。残した時刻はここで足す
export type DraftInput = Omit<DraftEntry, 'savedAt'>

// この道具だけのデータベース。オリジン(j-paku.github.io)はそこのほかのページと共有なので、
// 名前でどの道具のものかを示す。最初に呼ぶまでは何も開かない
const draftStore = createStore('html-editor', 'drafts')

// 1つのファイルの今の文字を残す。同じプロジェクトとパスでもう一度残すと、前の下書きを置き換える
export const saveDraft = (draft: DraftInput): Promise<void> =>
  set(
    draftKeyOf(draft.projectKey, draft.path),
    toDraftRecord({ ...draft, savedAt: Date.now() }),
    draftStore
  )

// 1つのプロジェクトの下書き。パスの順に並べる。古い形や壊れた形の記録は入れない
export const listDrafts = async (projectKey: string): Promise<DraftEntry[]> =>
  (await values(draftStore))
    .filter(isDraftRecord)
    .map(fromDraftRecord)
    .filter(draft => draft.projectKey === projectKey)
    .sort((a, b) => comparePaths(a.path, b.path))

// 1つのファイルの下書きを消す(保存した後、または編集を捨てた後)
export const deleteDraft = (projectKey: string, path: string): Promise<void> =>
  del(draftKeyOf(projectKey, path), draftStore)

// 1つのプロジェクトの下書きを全部消す。古い形や壊れた形の記録も消す
export const clearDrafts = async (projectKey: string): Promise<void> =>
  delMany(
    (await keys(draftStore)).filter(key => isDraftKeyOf(key, projectKey)),
    draftStore
  )
