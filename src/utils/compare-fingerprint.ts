// 読んだときのディスクのファイルの様子。最終更新時刻と大きさ。
// 保存するときは、ファイルを開いたときに取った指紋とディスクの今の指紋を比べる。
// 違えば、ファイルはこの道具の外で変えられた
export type FileFingerprint = { lastModified: number; size: number }

// 2つの項目だけを写す。そのためFileを渡せて、結果は保存できるただのオブジェクトのままになる
export const fingerprintOf = (file: FileFingerprint): FileFingerprint => ({
  lastModified: file.lastModified,
  size: file.size,
})

export const isSameFingerprint = (a: FileFingerprint, b: FileFingerprint): boolean =>
  a.lastModified === b.lastModified && a.size === b.size

// 保存されていた値が指紋の形をしているか(両方の項目が有限の数)
export const isFileFingerprint = (value: unknown): value is FileFingerprint => {
  const fingerprint = (value ?? {}) as Partial<Record<keyof FileFingerprint, unknown>>
  return Number.isFinite(fingerprint.lastModified) && Number.isFinite(fingerprint.size)
}
