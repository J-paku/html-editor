// 開いたフォルダの中のファイルのパス。そのフォルダからの相対で、'/'区切り、先頭に'/'を付けない。
// ただの文字列の処理で、ここではディスクに触れない

// パスの区切りごとの名前。空の部分と'.'を落とし、'..'を解決する。
// '..'が開いたフォルダより上へ出るときはnull
export const splitPath = (path: string): string[] | null => {
  const segments: string[] = []
  for (const part of path.split('/')) {
    if (part === '..') {
      if (segments.length === 0) return null
      segments.pop()
    } else if (part !== '' && part !== '.') {
      segments.push(part)
    }
  }
  return segments
}

// 同じパスを1つに決まった形にしたもの('a/./b/../c' → 'a/c')。開いたフォルダの外へ出るときはnull
export const normalizePath = (path: string): string | null => splitPath(path)?.join('/') ?? null

// relativeをフォルダbaseを起点に解決する。'/'で始まるrelativeは開いたフォルダそのものから始まる。
// 結果が開いたフォルダの外へ出るときはnull
export const joinPath = (base: string, relative: string): string | null =>
  normalizePath(relative.startsWith('/') ? relative : `${base}/${relative}`)

// 最後の区切りの拡張子。小文字にし、ドットを付けない(無ければ'')。
// ドットで始まるだけの名前('.env')には拡張子が無い
export const extensionOf = (path: string): string => {
  const name = path.slice(path.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

// パスの並べ順。UTF-16のコード単位で比べるので、順番がブラウザのロケールに左右されない
export const comparePaths = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
