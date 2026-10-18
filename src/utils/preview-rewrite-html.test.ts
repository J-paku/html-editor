// preview-rewrite-html.ts のテスト
import { describe, expect, it } from 'vitest'
import { type HtmlRewriters, rewriteHtmlReferences } from './preview-rewrite-html'

// URL と CSS の文字列を全部印で囲む。書き換えが見落とした(または取り違えた)値が結果に表れるようにするため
const MARK: HtmlRewriters = {
  url: reference => `[${reference}]`,
  css: css => `CSS(${css})`,
}
const rewrite = (html: string) => rewriteHtmlReferences(html, MARK)

describe('rewriteHtmlReferences', () => {
  describe('attributes that load a file', () => {
    it('rewrites src in double quotes, single quotes and bare, keeping the quotes', () => {
      expect(rewrite(`<img src="a.png"><img src='b.png'><img src=c.png>`)).toBe(
        `<img src="[a.png]"><img src='[b.png]'><img src=[c.png]>`
      )
    })

    it('keeps the spaces around =', () => {
      expect(rewrite('<img src = "a.png"><img src= b.png>')).toBe(
        '<img src = "[a.png]"><img src= [b.png]>'
      )
    })

    it('reads tag and attribute names in any case and writes them back as they were', () => {
      expect(rewrite('<IMG SRC="a.png">')).toBe('<IMG SRC="[a.png]">')
    })

    it('rewrites poster and data', () => {
      expect(rewrite('<video poster="p.jpg"></video><object data="d.svg"></object>')).toBe(
        '<video poster="[p.jpg]"></video><object data="[d.svg]"></object>'
      )
    })

    it('rewrites href and xlink:href on elements that load them', () => {
      expect(
        rewrite(
          '<link rel="stylesheet" href="a.css"><svg><use xlink:href="s.svg#i"/><image href="b.png"/></svg>'
        )
      ).toBe(
        '<link rel="stylesheet" href="[a.css]"><svg><use xlink:href="[s.svg#i]"/><image href="[b.png]"/></svg>'
      )
    })

    it('keeps href on a, area and base, in any case', () => {
      const html =
        '<a href="next.html">n</a><area href="map.html"><base href="sub/"><A HREF="x.html"></A><a xlink:href="y.html"></a>'
      expect(rewrite(html)).toBe(html)
    })

    it('keeps attributes that do not load a file', () => {
      const html = '<img alt="a.png" title=b.png data-src="c.png" class="src">'
      expect(rewrite(html)).toBe(html)
    })

    it('rewrites a self-closing tag', () => {
      expect(rewrite('<img src="a.png"/>')).toBe('<img src="[a.png]"/>')
    })

    it('does not end a tag at a > inside a quoted value', () => {
      expect(rewrite(`<img alt="a > b" title='c > d' src="e.png">`)).toBe(
        `<img alt="a > b" title='c > d' src="[e.png]">`
      )
    })
  })

  describe('&amp; in a value', () => {
    it('passes the value decoded for &amp;', () => {
      expect(rewrite('<img src="a&amp;b.png">')).toBe('<img src="[a&b.png]">')
    })

    it('keeps the value as written when the reference is kept', () => {
      const html = '<img src="a&amp;b.png">'
      expect(rewriteHtmlReferences(html, { ...MARK, url: () => undefined })).toBe(html)
    })
  })

  describe('srcset', () => {
    it('rewrites the URL of each candidate and keeps the descriptors', () => {
      expect(rewrite('<img srcset="a.png 1x, b.png 2x">')).toBe(
        '<img srcset="[a.png] 1x, [b.png] 2x">'
      )
    })

    it('rewrites imagesrcset, candidates without a space after the comma and spaces at the start', () => {
      expect(rewrite(`<link rel="preload" imagesrcset='  a.png 100w,b.png 200w'>`)).toBe(
        `<link rel="preload" imagesrcset='  [a.png] 100w,[b.png] 200w'>`
      )
    })

    it('passes each candidate decoded for &amp;', () => {
      expect(rewrite('<img srcset="a&amp;b.png 1x">')).toBe('<img srcset="[a&b.png] 1x">')
    })
  })

  describe('CSS', () => {
    it('rewrites a style attribute', () => {
      expect(rewrite(`<div style="background: url('a.png')"></div>`)).toBe(
        `<div style="CSS(background: url('a.png'))"></div>`
      )
    })

    it('rewrites the contents of a style element, with or without attributes, in any case', () => {
      expect(
        rewrite('<style>a { b: c }</style><style media="print">d {}</style><STYLE>e {}</Style >')
      ).toBe(
        '<style>CSS(a { b: c })</style><style media="print">CSS(d {})</style><STYLE>CSS(e {})</Style >'
      )
    })
  })

  describe('what is not HTML', () => {
    it('rewrites src of a script but not the text inside it', () => {
      expect(rewrite(`<script src="app.js">var s = '<img src="b.png">'</script>`)).toBe(
        `<script src="[app.js]">var s = '<img src="b.png">'</script>`
      )
    })

    it('does not read inside a script whose start tag has single-quoted values', () => {
      expect(rewrite(`<script src='app.js' type="module">'<img src="b.png">'</script>`)).toBe(
        `<script src='[app.js]' type="module">'<img src="b.png">'</script>`
      )
    })

    it('does not read inside a script without attributes or with spaces before the end of its end tag', () => {
      expect(rewrite(`<script>'<img src="b.png">'</script >`)).toBe(
        `<script>'<img src="b.png">'</script >`
      )
    })

    it('does not end a script start tag at a > inside a quoted value', () => {
      expect(rewrite(`<script data-x="a>b" src="app.js">'<img src="b.png">'</script>`)).toBe(
        `<script data-x="a>b" src="[app.js]">'<img src="b.png">'</script>`
      )
    })

    it('does not read inside textarea, title, iframe or noscript', () => {
      const html = [
        '<textarea><img src="a.png"></textarea>',
        '<title><img src="b.png"></title>',
        '<noscript><img src="c.png"></noscript>',
      ].join('\n')
      expect(rewrite(html)).toBe(html)
      expect(rewrite('<iframe src="f.html"><img src="d.png"></iframe>')).toBe(
        '<iframe src="[f.html]"><img src="d.png"></iframe>'
      )
    })

    it('does not read inside a comment', () => {
      const html = '<!-- <img src="b.png"> -->'
      expect(rewrite(html)).toBe(html)
    })

    it('reads an element whose name only starts like a raw text element as HTML', () => {
      expect(rewrite('<scripted><img src="b.png"></scripted>')).toBe(
        '<scripted><img src="[b.png]"></scripted>'
      )
    })

    it('leaves a document with nothing to rewrite as it is, < in text included', () => {
      const html = [
        '<!doctype html>',
        '<html lang="ja"><head><meta charset="utf-8"></head>',
        '<body><p class="x">1 < 2 and a<b</p></body></html>',
      ].join('\n')
      expect(rewrite(html)).toBe(html)
    })
  })
})
