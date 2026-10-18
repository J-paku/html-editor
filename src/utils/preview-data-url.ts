// ファイルの中身の data: URL。文字列は先に UTF-8 にする。
// Base64 なら URL は英字・数字と + / = ; : , だけになるので、HTML の属性・srcset・CSS の url() に
// エスケープ無しで入れられる。

// String.fromCharCode に一度に渡すバイト数。引数が多すぎるとスタックがあふれる(上限はエンジンごとに違う)ので、
// この大きさの組に分けて渡す
export const CHUNK_BYTES = 0x8000

export const toDataUrl = (content: string | Uint8Array, contentType: string): string => {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content
  // 1バイトを1文字にする(btoa はコードポイント 0〜255 の文字列を受け取る)。1バイトずつ文字にして並べると
  // 8MB の画像で800万個の配列ができ、組ごとに渡すより10倍ほど遅い(2026-10-18 に Node 22 で実測)。
  // 組を引数の並びとして渡すのに Reflect.apply を使うのは、Function.prototype.apply の型が配列しか受けず、
  // Uint8Array をそのまま渡せないため。スプレッド(...)は渡せるが、1要素ずつたどるので数倍遅い
  let binary = ''
  for (let rest = bytes; rest.length > 0; rest = rest.subarray(CHUNK_BYTES)) {
    binary += Reflect.apply(String.fromCharCode, null, rest.subarray(0, CHUNK_BYTES))
  }
  return `data:${contentType};base64,${btoa(binary)}`
}
