// 開いたフォルダの中のファイルの Content-Type。パスの拡張子で選ぶ。
// プレビューはファイルを data: URL に入れ、ブラウザはこの種類としてそれを読む。
export const HTML_CONTENT_TYPE = 'text/html;charset=utf-8'
export const CSS_CONTENT_TYPE = 'text/css;charset=utf-8'
export const FALLBACK_CONTENT_TYPE = 'application/octet-stream'

const JAVASCRIPT = 'text/javascript;charset=utf-8'
const JPEG = 'image/jpeg'

// 拡張子(小文字・ドット無し) → Content-Type
const TYPES: ReadonlyMap<string, string> = new Map([
  ['html', HTML_CONTENT_TYPE],
  ['htm', HTML_CONTENT_TYPE],
  ['css', CSS_CONTENT_TYPE],
  ['js', JAVASCRIPT],
  ['mjs', JAVASCRIPT],
  ['json', 'application/json;charset=utf-8'],
  ['txt', 'text/plain;charset=utf-8'],
  ['vtt', 'text/vtt;charset=utf-8'],
  ['svg', 'image/svg+xml'],
  ['png', 'image/png'],
  ['jpg', JPEG],
  ['jpeg', JPEG],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
  ['avif', 'image/avif'],
  ['ico', 'image/x-icon'],
  ['woff', 'font/woff'],
  ['woff2', 'font/woff2'],
  ['ttf', 'font/ttf'],
  ['otf', 'font/otf'],
  ['mp4', 'video/mp4'],
  ['webm', 'video/webm'],
  ['mp3', 'audio/mpeg'],
  ['wav', 'audio/wav'],
  ['ogg', 'audio/ogg'],
])

// ドットの無いパスは予備の種類にする。フォルダの名前にドットがあると拡張子に '/' が残り、
// どの項目にも当たらないので、フォルダを別に扱う必要は無い
export const contentTypeOf = (path: string): string => {
  const dot = path.lastIndexOf('.')
  const type = dot === -1 ? undefined : TYPES.get(path.slice(dot + 1).toLowerCase())
  return type ?? FALLBACK_CONTENT_TYPE
}
