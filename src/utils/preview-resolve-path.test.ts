// preview-resolve-path.ts のテスト
import { describe, expect, it } from 'vitest'
import { resolvePreviewPath } from './preview-resolve-path'

const at = (path: string, fragment = '') => ({ path, fragment })

describe('resolvePreviewPath', () => {
  it('resolves a name next to the referencing file', () => {
    expect(resolvePreviewPath('index.html', 'style.css')).toEqual(at('style.css'))
  })

  it('resolves against the folder of the referencing file', () => {
    expect(resolvePreviewPath('pages/intro/index.html', 'img/a.png')).toEqual(
      at('pages/intro/img/a.png')
    )
  })

  it('climbs with .. and skips .', () => {
    expect(resolvePreviewPath('css/deep/style.css', '../../img/./a.png')).toEqual(at('img/a.png'))
  })

  it('stops .. at the root of the folder, as a browser does at a site root', () => {
    expect(resolvePreviewPath('css/style.css', '../../../a.png')).toEqual(at('a.png'))
  })

  it('starts a reference with / at the root of the folder', () => {
    expect(resolvePreviewPath('pages/index.html', '/img/a.png')).toEqual(at('img/a.png'))
  })

  it('drops spaces around the reference and reads \\ as /', () => {
    expect(resolvePreviewPath('index.html', '  img\\a.png \n')).toEqual(at('img/a.png'))
  })

  it('drops the query and keeps the fragment', () => {
    expect(resolvePreviewPath('index.html', 'sprite.svg?v=2#icon')).toEqual(
      at('sprite.svg', '#icon')
    )
  })

  it('decodes escapes in the reference', () => {
    expect(resolvePreviewPath('index.html', 'my%20image.png')).toEqual(at('my image.png'))
    expect(resolvePreviewPath('index.html', 'my image.png')).toEqual(at('my image.png'))
  })

  it('keeps a % that does not start an escape', () => {
    expect(resolvePreviewPath('index.html', '100%.png')).toEqual(at('100%.png'))
  })

  it('does not read #, ? or % in the name of the referencing file as URL syntax', () => {
    expect(resolvePreviewPath('a#b?c/100%/index.html', 'x.png')).toEqual(at('a#b?c/100%/x.png'))
  })

  it('treats a colon after a slash as part of a path, not a scheme', () => {
    expect(resolvePreviewPath('index.html', 'img/x:y.png')).toEqual(at('img/x:y.png'))
  })

  it('resolves a reference to the same file to that file', () => {
    expect(resolvePreviewPath('index.html', '#top')).toEqual(at('index.html', '#top'))
    expect(resolvePreviewPath('css/style.css', '')).toEqual(at('css/style.css'))
  })

  it.each([
    'https://cdn.example.com/a.css',
    'http://example.com/a.png',
    '//cdn.example.com/a.js',
    'data:image/png;base64,AAAA',
    'blob:http://preview.invalid/1234',
    'mailto:a@example.com',
    'javascript:void(0)',
  ])('leaves the folder for %s', reference => {
    expect(resolvePreviewPath('index.html', reference)).toBeUndefined()
  })

  it('returns undefined for a reference the URL parser rejects', () => {
    expect(resolvePreviewPath('index.html', 'http://[')).toBeUndefined()
  })
})
