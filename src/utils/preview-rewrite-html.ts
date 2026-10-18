// HTML の文字列の中の、ファイルを読み込む参照を書き換える:
//   - ファイルを読み込む属性: src・poster・data・srcset・imagesrcset と、a・area・base 以外の href・xlink:href
//     (a・area・base の href は移動するか基準を決めるもので、読み込まない)
//   - <style> 要素と style 属性の CSS(rewriters.css を通す)
// 注釈と、生の文字の要素(<script>・<textarea>・<title> …)の中身は HTML として読まない。
// 変わるのは書き換えた値だけで、タグ・属性の名前・引用符・空白は書かれたまま残る。
// 文字の並びで探す(依存にまだパーサが無い)ので、HTML の字句の切り方には上の範囲でしか従わない:
// 値の中の &amp; はその1つの実体参照だけを戻してから解決し、ほかの実体参照は戻さない。
import { splitQuotes } from './preview-split-quotes'

export type HtmlRewriters = {
  // 書かれたままの参照(&amp; だけは戻したもの)を受け取り、新しい URL か、残すなら undefined を返す
  url: (reference: string) => string | undefined
  // CSS の文字列を受け取り、書き換えたものを返す
  css: (css: string) => string
}

// 字句1つ: 注釈 | 中身と終了タグまでを含む生の文字の要素 | ほかの開始タグ。
// グループ: 1 生の文字の要素の名前、2 その属性、3 その中身、4 その終了タグ、5 タグの名前、6 その属性。
// 属性は引用符の外の最初の > まで続くので、引用符の中の > ではタグが終わらない
const TOKEN =
  /<!--[\s\S]*?-->|<(script|style|textarea|title|xmp|iframe|noembed|noframes|noscript)(?=[\s>])((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)(<\/\1\s*>)|<([a-z][^\s/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/gi
// 値を持つ属性1つ。グループ: 1 名前、2 = とその前後の空白、3 書かれたままの値
const ATTRIBUTE = /([^\s"'>/=]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'>]+)/g
// srcset の候補ごとの URL(先頭かカンマの後の最初の語。残りは記述子)。
// グループ: 1 先頭かカンマと、その後の空白、2 URL
const SRCSET_URL = /((?:^|,)\s*)([^\s,]+)/g

const URL_ATTRIBUTES = ['src', 'poster', 'data']
const LINK_ATTRIBUTES = ['href', 'xlink:href']
const SRCSET_ATTRIBUTES = ['srcset', 'imagesrcset']
const NAVIGATION_ELEMENTS = ['a', 'area', 'base']

// ある要素のある属性(どちらも小文字)の値の書き換え方。残すなら undefined
const rewriterOf = (
  element: string,
  attribute: string,
  rewriters: HtmlRewriters
): ((value: string) => string) | undefined => {
  const url = (value: string) => rewriters.url(value.replaceAll('&amp;', '&')) ?? value
  if (attribute === 'style') return rewriters.css
  if (SRCSET_ATTRIBUTES.includes(attribute)) {
    return value =>
      value.replace(
        SRCSET_URL,
        (_match, lead: string, reference: string) => `${lead}${url(reference)}`
      )
  }
  if (URL_ATTRIBUTES.includes(attribute)) return url
  if (LINK_ATTRIBUTES.includes(attribute) && !NAVIGATION_ELEMENTS.includes(element)) return url
  return undefined
}

const rewriteAttributes = (element: string, attributes: string, rewriters: HtmlRewriters): string =>
  attributes.replace(ATTRIBUTE, (match, name: string, equals: string, value: string) => {
    const rewrite = rewriterOf(element.toLowerCase(), name.toLowerCase(), rewriters)
    if (rewrite === undefined) return match
    const { quote, inner } = splitQuotes(value)
    return `${name}${equals}${quote}${rewrite(inner)}${quote}`
  })

export const rewriteHtmlReferences = (html: string, rewriters: HtmlRewriters): string =>
  html.replace(
    TOKEN,
    (
      match,
      rawName: string | undefined,
      rawAttributes: string,
      rawContent: string,
      rawEnd: string,
      name: string | undefined,
      attributes: string
    ) => {
      if (rawName !== undefined) {
        const content = rawName.toLowerCase() === 'style' ? rewriters.css(rawContent) : rawContent
        return `<${rawName}${rewriteAttributes(rawName, rawAttributes, rewriters)}>${content}${rawEnd}`
      }
      // 名前の無い字句は注釈だけ
      if (name === undefined) return match
      return `<${name}${rewriteAttributes(name, attributes, rewriters)}>`
    }
  )
