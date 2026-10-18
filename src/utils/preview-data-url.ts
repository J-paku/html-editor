// ファイルの中身の data: URL。文字列は先に UTF-8 にする。
// Base64 なら URL は英字・数字と + / = ; : , だけになるので、HTML の属性・srcset・CSS の url() に
// エスケープ無しで入れられる。

// String.fromCharCode に一度に渡すバイト数(2 の CHUNK_SHIFT 乗)。引数が多すぎるとスタックがあふれる(上限はエンジンごとに違う)ので、
// この大きさの組に分けて渡す
const CHUNK_SHIFT = 15
export const CHUNK_BYTES = 1 << CHUNK_SHIFT

export const toDataUrl = (content: string | Uint8Array, contentType: string): string => {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content
  // 1バイトを1文字にする(btoa はコードポイント 0〜255 の文字列を受け取る)。1バイトずつ文字にして並べると
  // 8MB の画像で800万個の配列ができ、組ごとに渡すより10倍ほど遅い(2026-10-18 に Node 22 で実測)。
  // 組を引数の並びとして渡すのに Reflect.apply を使うのは、Function.prototype.apply の型が配列しか受けず、
  // Uint8Array をそのまま渡せないため。スプレッド(...)は渡せるが、1要素ずつたどるので数倍遅い
  //
  // 組は、満ちた組を数を決めて並べ、最後に残り(CHUNK_BYTES 未満。空のこともある)を足す。続けるかを決める条件を
  // 持たないので、変異テストで式を壊しても回り終わり、違う値になる(AGENTS.md の「テスト(4層)」)。
  // 満ちた組の数を割り算(Math.floor(bytes.length / CHUNK_BYTES))で出さないのは、/ を * にした変異体で数が
  // CHUNK_BYTES 倍になるため。増えた組は空で結果が変わらずテストに現れないまま、回り終わらない(時間切れ)。
  // 右シフト(>>>)は変異の対象に無い。数え過ぎは元から結果を変えない(増えた組も残りも空になる)ので、ここに変異体が
  // 無くても、テストが見落とす振る舞いの違いは生まれない。
  // >>> は 32 ビットで数えるので 4GB 以上では数が足りなくなるが、そのときは残りが CHUNK_BYTES より長くなり
  // Reflect.apply が投げる(元の形でも、そこまで長い文字列は作れずに投げる)
  const full = bytes.length >>> CHUNK_SHIFT
  const pieces = Array.from({ length: full }, (_, i) =>
    bytes.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES)
  )
  const binary = [...pieces, bytes.subarray(full * CHUNK_BYTES)]
    .map(piece => Reflect.apply(String.fromCharCode, null, piece))
    .join('')
  return `data:${contentType};base64,${btoa(binary)}`
}
