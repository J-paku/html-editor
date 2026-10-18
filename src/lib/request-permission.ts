// ハンドルを通して書き込む許可を確かめ、もう一度求める。
// ブラウザは許可を落とすことがある(新しいセッション、または利用者が取り消した)ので、保存するときにもう一度求める。
// 許可のメソッドはTypeScriptのDOMの型に無いので、下で型を付ける
type PermissionDescriptor = { mode: 'read' | 'readwrite' }

type PermissionHandle = FileSystemHandle & {
  queryPermission?: (descriptor: PermissionDescriptor) => Promise<PermissionState>
  requestPermission?: (descriptor: PermissionDescriptor) => Promise<PermissionState>
}

const READ_WRITE: PermissionDescriptor = { mode: 'readwrite' }

// 今の書き込みの許可。利用者には尋ねない。許可のメソッドが無いハンドル
// (その確認を出さないブラウザ)はいつでも書き込めるので、grantedと答える
export const queryWritePermission = async (handle: FileSystemHandle): Promise<PermissionState> =>
  (await (handle as PermissionHandle).queryPermission?.(READ_WRITE)) ?? 'granted'

// 書き込んでよいか。まだ許可されていなければ利用者に尋ねる。
// 利用者の操作(クリック)から呼ぶ(ブラウザはそのときにしか確認を出さない)
export const ensureWritePermission = async (handle: FileSystemHandle): Promise<boolean> => {
  if ((await queryWritePermission(handle)) === 'granted') return true
  return (await (handle as PermissionHandle).requestPermission?.(READ_WRITE)) === 'granted'
}
