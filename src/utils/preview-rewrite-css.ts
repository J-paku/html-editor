// CSS の文字列の中の参照を書き換える: url(…)(引用符付きでも裸でも。規則・@font-face・@import url(…) の中)と、
// 引用符の形の @import "…"。replace は書かれたままの参照を受け取り、新しい URL か、残すなら undefined を返す。
// 変わるのは参照だけで、引用符もほかの文字も書かれたまま残る。
// 文字の並びで探すので、注釈や文字列の中の url( も書き換わる(何も読み込まないので害は無い)。
import { splitQuotes } from './preview-split-quotes'

// グループ 1: url( と空白、または引用符の前の @import と空白(@import の後ろの裸の語は url(…) で、
// それは url( の枝が拾う)。グループ 2: 参照。二重引用符付き・一重引用符付き・裸のどれか
const CSS_REFERENCE = /(url\(\s*|@import\s*(?=["']))("[^"]*"|'[^']*'|[^"'\s()]+)/gi

export const rewriteCssReferences = (
  css: string,
  replace: (reference: string) => string | undefined
): string =>
  css.replace(CSS_REFERENCE, (_match, prefix: string, value: string) => {
    const { quote, inner } = splitQuotes(value)
    return `${prefix}${quote}${replace(inner) ?? inner}${quote}`
  })
