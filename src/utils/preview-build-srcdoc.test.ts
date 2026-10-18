// preview-build-srcdoc.ts のテスト
import { describe, expect, it } from 'vitest'
import { buildPreviewSrcdoc, type PreviewFile } from './preview-build-srcdoc'
import { toDataUrl } from './preview-data-url'

const PNG = new Uint8Array([137, 80, 78, 71])
const PNG_URL = toDataUrl(PNG, 'image/png')
const CSS = 'text/css;charset=utf-8'
const HTML = 'text/html;charset=utf-8'
const bytesOf = (text: string) => new TextEncoder().encode(text)

describe('buildPreviewSrcdoc', () => {
  it('returns undefined when no file has the start path', () => {
    expect(buildPreviewSrcdoc([{ path: 'a.html', content: '' }], 'index.html')).toBeUndefined()
  })

  it('replaces references at every depth: HTML → CSS in a folder → an image in another folder', () => {
    const files: PreviewFile[] = [
      { path: 'index.html', content: '<link rel="stylesheet" href="css/style.css"><p>x</p>' },
      { path: 'css/style.css', content: 'p { background: url(../img/bg.png) }' },
      { path: 'img/bg.png', content: PNG },
    ]
    const css = toDataUrl(`p { background: url(${PNG_URL}) }`, CSS)
    expect(buildPreviewSrcdoc(files, 'index.html')).toBe(
      `<link rel="stylesheet" href="${css}"><p>x</p>`
    )
  })

  it('reads HTML and CSS given as bytes as UTF-8', () => {
    const files: PreviewFile[] = [
      { path: 'index.html', content: bytesOf('<h1>é</h1><link rel="stylesheet" href="a.css">') },
      { path: 'a.css', content: bytesOf('h1 { background: url(a.png) } /* é */') },
      { path: 'a.png', content: PNG },
    ]
    const css = toDataUrl(`h1 { background: url(${PNG_URL}) } /* é */`, CSS)
    expect(buildPreviewSrcdoc(files, 'index.html')).toBe(
      `<h1>é</h1><link rel="stylesheet" href="${css}">`
    )
  })

  it('rewrites a style attribute and a style element against the start HTML', () => {
    const files: PreviewFile[] = [
      {
        path: 'index.html',
        content: `<style>p { background: url('img/a.png') }</style><div style="background: url(img/a.png)"></div>`,
      },
      { path: 'img/a.png', content: PNG },
    ]
    expect(buildPreviewSrcdoc(files, 'index.html')).toBe(
      `<style>p { background: url('${PNG_URL}') }</style><div style="background: url(${PNG_URL})"></div>`
    )
  })

  it('resolves against the folder of a start HTML inside a folder', () => {
    const files: PreviewFile[] = [
      { path: 'site/index.html', content: '<img src="a.png">' },
      { path: 'site/a.png', content: PNG },
      { path: 'a.png', content: new Uint8Array([1]) },
    ]
    expect(buildPreviewSrcdoc(files, 'site/index.html')).toBe(`<img src="${PNG_URL}">`)
  })

  it('keeps references outside the folder and to files that are not in it', () => {
    const html =
      '<script src="https://cdn.example.com/x.js"></script><img src="missing.png"><img src="data:image/png;base64,AA==">'
    expect(buildPreviewSrcdoc([{ path: 'index.html', content: html }], 'index.html')).toBe(html)
  })

  it('puts the fragment back after the data: URL', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="i"/></svg>'
    const files: PreviewFile[] = [
      { path: 'index.html', content: '<svg><use href="sprite.svg?v=1#i"/></svg>' },
      { path: 'sprite.svg', content: svg },
    ]
    expect(buildPreviewSrcdoc(files, 'index.html')).toBe(
      `<svg><use href="${toDataUrl(svg, 'image/svg+xml')}#i"/></svg>`
    )
  })

  it('keeps references to the same file', () => {
    const files: PreviewFile[] = [
      {
        path: 'index.html',
        content:
          '<svg><use href="#i"/></svg><iframe src="index.html"></iframe><link rel="stylesheet" href="a.css">',
      },
      { path: 'a.css', content: 'p { mask: url(#m) }' },
    ]
    expect(buildPreviewSrcdoc(files, 'index.html')).toBe(
      `<svg><use href="#i"/></svg><iframe src="index.html"></iframe><link rel="stylesheet" href="${toDataUrl('p { mask: url(#m) }', CSS)}">`
    )
  })

  it('ends a cycle of imports by keeping the reference that closes it', () => {
    const files: PreviewFile[] = [
      { path: 'index.html', content: '<link rel="stylesheet" href="a.css">' },
      { path: 'a.css', content: '@import "b.css"; .a {}' },
      { path: 'b.css', content: '@import "a.css"; .b {}' },
    ]
    const b = toDataUrl('@import "a.css"; .b {}', CSS)
    const a = toDataUrl(`@import "${b}"; .a {}`, CSS)
    expect(buildPreviewSrcdoc(files, 'index.html')).toBe(`<link rel="stylesheet" href="${a}">`)
  })

  it('rewrites an HTML file loaded by an iframe against its own folder', () => {
    const files: PreviewFile[] = [
      { path: 'index.html', content: '<iframe src="pages/p.html"></iframe>' },
      { path: 'pages/p.html', content: '<img src="../img/a.png">' },
      { path: 'img/a.png', content: PNG },
    ]
    const page = toDataUrl(`<img src="${PNG_URL}">`, HTML)
    expect(buildPreviewSrcdoc(files, 'index.html')).toBe(`<iframe src="${page}"></iframe>`)
  })

  it('encodes a script as it is, without rewriting text that looks like CSS', () => {
    const js = `document.body.style.background = 'url(a.png)'`
    const files: PreviewFile[] = [
      { path: 'index.html', content: '<script src="app.js"></script>' },
      { path: 'app.js', content: js },
      { path: 'a.png', content: PNG },
    ]
    expect(buildPreviewSrcdoc(files, 'index.html')).toBe(
      `<script src="${toDataUrl(js, 'text/javascript;charset=utf-8')}"></script>`
    )
  })

  it('returns a start file that is neither HTML nor CSS as its text', () => {
    const svg = '<svg><image href="a.png"/></svg>'
    const files: PreviewFile[] = [
      { path: 'a.svg', content: svg },
      { path: 'a.png', content: PNG },
    ]
    expect(buildPreviewSrcdoc(files, 'a.svg')).toBe(svg)
  })

  it('reuses the data: URL made for the same bytes object in a later build, and encodes a new object', () => {
    const html = { path: 'index.html', content: '<img src="a.png">' }
    const bytes = new Uint8Array([1, 2, 3])
    const first = buildPreviewSrcdoc([html, { path: 'a.png', content: bytes }], 'index.html')
    expect(first).toBe(`<img src="${toDataUrl(new Uint8Array([1, 2, 3]), 'image/png')}">`)
    // 編集器はバイト列を書き換えない。ここで書き換えるのは、2回目が Base64 にし直さずに覚えた URL を使ったことを
    // 結果で見るため
    bytes.fill(9)
    expect(buildPreviewSrcdoc([html, { path: 'a.png', content: bytes }], 'index.html')).toBe(first)
    // 同じパスでも、読み直したファイル(新しいオブジェクト)はその中身で作る
    const reread = new Uint8Array([9, 9, 9])
    expect(buildPreviewSrcdoc([html, { path: 'a.png', content: reread }], 'index.html')).toBe(
      `<img src="${toDataUrl(new Uint8Array([9, 9, 9]), 'image/png')}">`
    )
  })

  it('keeps one data: URL per content type for the same bytes object', () => {
    const bytes = new Uint8Array([4, 5, 6])
    const files: PreviewFile[] = [
      { path: 'index.html', content: '<img src="a.png"><img src="a.gif"><img src="a.png">' },
      { path: 'a.png', content: bytes },
      { path: 'a.gif', content: bytes },
    ]
    const png = toDataUrl(bytes, 'image/png')
    expect(buildPreviewSrcdoc(files, 'index.html')).toBe(
      `<img src="${png}"><img src="${toDataUrl(bytes, 'image/gif')}"><img src="${png}">`
    )
  })

  it('puts the same data: URL at every reference to the same text file', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="a"/><symbol id="b"/></svg>'
    const files: PreviewFile[] = [
      {
        path: 'index.html',
        content: '<svg><use href="sprite.svg#a"/><use href="sprite.svg#b"/></svg>',
      },
      { path: 'sprite.svg', content: svg },
    ]
    const sprite = toDataUrl(svg, 'image/svg+xml')
    expect(buildPreviewSrcdoc(files, 'index.html')).toBe(
      `<svg><use href="${sprite}#a"/><use href="${sprite}#b"/></svg>`
    )
  })

  it('makes the data: URL of a text file from its text at each build, so an edit shows', () => {
    const html = { path: 'index.html', content: '<link rel="stylesheet" href="a.css">' }
    buildPreviewSrcdoc([html, { path: 'a.css', content: 'p {}' }], 'index.html')
    expect(
      buildPreviewSrcdoc([html, { path: 'a.css', content: 'p { color: red }' }], 'index.html')
    ).toBe(`<link rel="stylesheet" href="${toDataUrl('p { color: red }', CSS)}">`)
  })
})
