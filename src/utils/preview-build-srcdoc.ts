// プレビューの iframe の srcdoc。開いたフォルダの開始 HTML の、フォルダの中のファイルへの参照を全部、
// そのファイルの data: URL に置き換えたもの。HTML と CSS のファイルも data: URL にする前に同じように書き換える
// (スタイルシートの url() と @import、iframe の HTML)ので、どの深さの参照も効く。
//
// data: URL にする理由(docs/design.md の「위험」1。2026-10-18 に Chromium 153 で実測): プレビューは
// allow-same-origin の無い sandbox="allow-scripts" で走らせるので、HTML は編集器の IndexedDB・フォルダのハンドル・
// DOM に届かない。そういう iframe は不透明なオリジンを持ち、編集器の Service Worker はその要求を受け取らず、
// 編集器が作った blob: URL もその中では読めない。data: URL は読める(CSS・CSS の中の url()・画像・
// classic と module のスクリプト・fetch())。
//
// 扱わないもの: スクリプトが実行中に組む参照(fetch('data.json')・module の中の import './x.js'・
// img.src = 'a.png')と、移動するリンク(a の href)。これらはフォルダではなく編集器の URL を起点に解決される。
import { CSS_CONTENT_TYPE, HTML_CONTENT_TYPE, contentTypeOf } from './preview-content-type'
import { toDataUrl } from './preview-data-url'
import { resolvePreviewPath } from './preview-resolve-path'
import { rewriteCssReferences } from './preview-rewrite-css'
import { rewriteHtmlReferences } from './preview-rewrite-html'

export type PreviewFile = {
  // 開いたフォルダの直下からのパス。'/' 区切りで、先頭に ./ や / を付けない(css/style.css)
  path: string
  // 文字のファイルならその文字列、バイナリのファイルならそのバイト列(HTML と CSS のバイト列は UTF-8 として読む)
  content: string | Uint8Array
}

const textOf = (content: string | Uint8Array): string =>
  typeof content === 'string' ? content : new TextDecoder().decode(content)

// 覚えておく入れ物(Map と WeakMap のどちらも入る)
type Cache<K, V> = {
  get: (key: K) => V | undefined
  set: (key: K, value: V) => void
}

// cache に key のものがあればそれを、無ければ make で作って覚えてから返す
const remembered = <K, V>(cache: Cache<K, V>, key: K, make: () => V): V => {
  const found = cache.get(key)
  if (found !== undefined) return found
  const made = make()
  cache.set(key, made)
  return made
}

// バイナリのファイルの data: URL を、バイト列のオブジェクトごと・種類(Content-Type)ごとに覚えておく。
// 同じファイルを何度参照しても、srcdoc を何度作り直しても(コードを打つたびに作り直す)、Base64 にするのは1回で済む
// (8MB の画像で1回 60ms ほど。2026-10-18 に Node 22 で実測)。オブジェクトで見分けるのは、編集器がバイト列を
// 読んだ後に書き換えないから(読み直すときは新しい Uint8Array を作る。src/components/EditorPage/utils/load-file.ts)。
// WeakMap なので、ファイルを閉じてバイト列が要らなくなれば、覚えた URL も一緒に消える
const binaryUrls = new WeakMap<Uint8Array, Map<string, string>>()

// entryPath のファイルが無ければ undefined を返す
export const buildPreviewSrcdoc = (
  files: readonly PreviewFile[],
  entryPath: string
): string | undefined => {
  const contents = new Map(files.map(file => [file.path, file.content]))
  // 文字の中身(書き換えた HTML と CSS、そのままのほかの種類)の data: URL は、中身の文字列ごとに覚える。
  // 文字は打つたびに変わり、どの文字列がまた来るか分からないので、覚えるのはこの1回の組み立ての間だけ
  // (同じ SVG のスプライトを何か所も参照するとき、Base64 にするのが1回で済む)
  const textUrls = new Map<string, Map<string, string>>()
  const dataUrlOf = (content: string | Uint8Array, contentType: string): string => {
    const urls =
      typeof content === 'string'
        ? remembered(textUrls, content, () => new Map<string, string>())
        : remembered(binaryUrls, content, () => new Map<string, string>())
    return remembered(urls, contentType, () => toDataUrl(content, contentType))
  }

  // ファイルの中身の参照を置き換えたもの(HTML と CSS)、またはそのままの中身(ほかの種類)。
  // chain は書き換えている途中のファイルの並びで、外側から順に並ぶ。その中のファイルへ戻る参照は書かれたままにする。
  // これで循環(a.css が b.css を読み、b.css が a.css を読む)が止まり、同じファイルへの参照(#id)も触らずに済む。
  // 再帰が終わることは、条件式の正しさではなく形で決まる(変異テストで式を壊しても終わる。AGENTS.md の「テスト(4層)」)。
  // - 深く入るのはフォルダの中にあって chain に無いファイルだけで、入るたびに chain がそのファイルの分だけ伸びる。
  //   chain は違うファイルの並びのままなので、深さはフォルダのファイルの数を超えない
  //   (中身を引けないまま入る変異体は、中身を空の文字として読むか投げるので、その先へは入らない)
  // - chain を伸ばすのは concat で、[...chain, path] と書かない。配列の式は変異で [] になり、chain が伸びずに循環が止まらない
  // - chain の中かは、if の条件ではなく、中身を引く式の三項演算子の条件で見る。if の条件は変異で false になって
  //   chain を見なくなるが、三項演算子の条件(関数の呼び出し)は変異の対象に無い
  const rewrite = (
    path: string,
    content: string | Uint8Array,
    chain: readonly string[]
  ): string | Uint8Array => {
    const replace = (reference: string): string | undefined => {
      const target = resolvePreviewPath(path, reference)
      if (target === undefined) return undefined
      const found = chain.includes(target.path) ? undefined : contents.get(target.path)
      if (found === undefined) return undefined
      const encoded = dataUrlOf(
        rewrite(target.path, found, chain.concat(target.path)),
        contentTypeOf(target.path)
      )
      return `${encoded}${target.fragment}`
    }
    const type = contentTypeOf(path)
    if (type === CSS_CONTENT_TYPE) return rewriteCssReferences(textOf(content), replace)
    if (type === HTML_CONTENT_TYPE) {
      return rewriteHtmlReferences(textOf(content), {
        url: replace,
        css: css => rewriteCssReferences(css, replace),
      })
    }
    return content
  }

  const entry = contents.get(entryPath)
  return entry === undefined ? undefined : textOf(rewrite(entryPath, entry, [entryPath]))
}
