// 開いたフォルダのファイルに書かれた参照(HTML の src・href、CSS の url())を、それが指すファイルのパスへ解決する。
// フォルダをサイトの直下として配ったときにブラウザがするのと同じ解決をする。
// 仕事は作り物のオリジンを起点に WHATWG の URL パーサがする: '..' は直下で止まり、'/x' は直下から始まり、
// '\' は '/' として数え、参照の前後の空白は落とす。どれもブラウザと同じ。
// 作り物のオリジンの下に来ない参照はフォルダの外(https:・data:・blob:・mailto:・//host/…)で、undefined になる。
// クエリは落とす(フォルダには1つのパスに1つのファイルしか無い)。
// 同じファイルへの参照('' や '#id')はそのファイルへ解決する。それをどう扱うかは呼ぶ側が決める。
const ORIGIN = 'http://preview.invalid'

export type ResolvedReference = {
  // フォルダの直下からのパス。'/' 区切りで、エスケープを戻したもの(my%20image.png ではなく my image.png)
  path: string
  // パスの後ろに書かれたままの '#…'。無ければ ''
  fragment: string
}

// ファイル自身のパスを URL にしたもの。ファイル名の中の '#'・'?'・'%' を URL の記号として読ませないため
const urlOfFile = (path: string): string =>
  `${ORIGIN}/${path.split('/').map(encodeURIComponent).join('/')}`

// エスケープを始めない '%'(100%.png)は、URL パーサと同じくそのまま残す
const decodePath = (path: string): string => {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

export const resolvePreviewPath = (
  fromFile: string,
  reference: string
): ResolvedReference | undefined => {
  const url = URL.parse(reference, urlOfFile(fromFile))
  // url.origin ではなく URL 全体の先頭で比べる。blob:http://preview.invalid/… もそのオリジンを持つため
  if (url === null || !url.href.startsWith(`${ORIGIN}/`)) return undefined
  return { path: decodePath(url.pathname.slice(1)), fragment: url.hash }
}
