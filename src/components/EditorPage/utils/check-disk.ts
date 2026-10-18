// 保存がディスクのファイルに上書きしてよいか
import { isSameFingerprint, type FileFingerprint } from '@/utils/compare-fingerprint'

// ディスクのファイルがまだ読んだ版のままか。ある(diskがnullでない)うえで、指紋が同じ。
// それ以外はこの道具の外で変わったということで、どうするかは利用者が選ぶ
export const isUnchangedOnDisk = (disk: FileFingerprint | null, opened: FileFingerprint): boolean =>
  disk !== null && isSameFingerprint(disk, opened)
