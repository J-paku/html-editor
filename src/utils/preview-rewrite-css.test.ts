// preview-rewrite-css.ts のテスト
import { describe, expect, it } from 'vitest'
import { rewriteCssReferences } from './preview-rewrite-css'

// 参照を全部印で囲む。書き換えが見落とした(または取り違えた)参照が結果に表れるようにするため
const mark = (reference: string) => `<${reference}>`
const rewrite = (css: string) => rewriteCssReferences(css, mark)

describe('rewriteCssReferences', () => {
  it('rewrites a bare url()', () => {
    expect(rewrite('a { background: url(img/a.png) }')).toBe('a { background: url(<img/a.png>) }')
  })

  it('rewrites a double-quoted and a single-quoted url(), keeping the quotes', () => {
    expect(rewrite(`a { b: url("x y.png"); c: url('z.png') }`)).toBe(
      `a { b: url("<x y.png>"); c: url('<z.png>') }`
    )
  })

  it('keeps the spaces inside url( )', () => {
    expect(rewrite('url( a.png )')).toBe('url( <a.png> )')
    expect(rewrite('url(  "a.png" )')).toBe('url(  "<a.png>" )')
  })

  it('matches URL( in any case', () => {
    expect(rewrite('URL(a.png)')).toBe('URL(<a.png>)')
  })

  it('rewrites every url() in a declaration', () => {
    expect(
      rewrite(`@font-face { src: url(a.woff2) format('woff2'), url("b.woff") format('woff') }`)
    ).toBe(`@font-face { src: url(<a.woff2>) format('woff2'), url("<b.woff>") format('woff') }`)
  })

  it('rewrites the quoted form of @import, with or without a space', () => {
    expect(rewrite(`@import "a.css";\n@import 'b.css' screen;\n@import"c.css";`)).toBe(
      `@import "<a.css>";\n@import '<b.css>' screen;\n@import"<c.css>";`
    )
  })

  it('rewrites @import url() through the url( branch, not the word url', () => {
    expect(rewrite('@import url(a.css);')).toBe('@import url(<a.css>);')
  })

  it('passes the text inside an empty quoted url() and keeps a reference replace leaves', () => {
    const seen: string[] = []
    const result = rewriteCssReferences(`a { b: url(""); c: url(keep.png) }`, reference => {
      seen.push(reference)
      return undefined
    })
    expect(seen).toEqual(['', 'keep.png'])
    expect(result).toBe(`a { b: url(""); c: url(keep.png) }`)
  })

  it('leaves CSS without references as it is', () => {
    const css = '.a { color: var(--color-text); content: "("; }'
    expect(rewrite(css)).toBe(css)
  })
})
