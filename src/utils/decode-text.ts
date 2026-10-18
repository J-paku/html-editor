// 文字のファイルのバイトを、編集器が扱う文字列にする。バイトに戻すときに何も失わないようにする。
// 文字列を書き戻すときはUTF-8にするので、文字にするときは、そのUTF-8が戻すはずのバイトを全部残さなければならない:
// - バイト順マークは文字列に残す(ignoreBOM)。持っていたファイルは保存した後も持っている
// - 正しいUTF-8でないバイト(たとえばShift_JISのページ)は、U+FFFDに置き換えずに断る(fatal)。
//   置き換えると、次に保存したときにファイルが壊れる
// バイトが正しいUTF-8でなければnullを返す
export const decodeUtf8 = (bytes: BufferSource): string | null => {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  } catch {
    return null
  }
}
