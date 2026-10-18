// 開いたフォルダの中のパス。区切ること、決まった形にすること、つなぐこと、拡張子、並べ順
import { describe, expect, it } from 'vitest'
import { comparePaths, extensionOf, joinPath, normalizePath, splitPath } from './resolve-path'

describe('splitPath', () => {
  it.each([
    ['index.html', ['index.html']],
    ['css/style.css', ['css', 'style.css']],
    ['', []],
    ['/', []],
    ['/a//b/', ['a', 'b']],
    ['./a/./b', ['a', 'b']],
    ['a/b/../c', ['a', 'c']],
    ['a/..', []],
    ['a/b/../../c', ['c']],
    ['...', ['...']],
    ['.a/..b', ['.a', '..b']],
  ])('%j → %j', (path, segments) => {
    expect(splitPath(path)).toEqual(segments)
  })

  it.each(['..', '../a', 'a/../..', 'a/../../b', '/../a'])(
    '%j climbs above the opened folder → null',
    path => {
      expect(splitPath(path)).toBeNull()
    }
  )
})

describe('normalizePath', () => {
  it.each([
    ['a/./b/../c', 'a/c'],
    ['/css//style.css', 'css/style.css'],
    ['img/logo.png', 'img/logo.png'],
    ['', ''],
  ])('%j → %j', (path, normalized) => {
    expect(normalizePath(path)).toBe(normalized)
  })

  it('a path that leaves the opened folder → null', () => {
    expect(normalizePath('../outside.css')).toBeNull()
  })
})

describe('joinPath', () => {
  it.each([
    ['pages', 'style.css', 'pages/style.css'],
    ['pages', '../css/style.css', 'css/style.css'],
    ['pages/deep', './img/a.png', 'pages/deep/img/a.png'],
    ['', 'index.html', 'index.html'],
  ])('%j + %j → %j', (base, relative, joined) => {
    expect(joinPath(base, relative)).toBe(joined)
  })

  it('a relative path starting with / starts from the opened folder, not from base', () => {
    expect(joinPath('pages/deep', '/css/style.css')).toBe('css/style.css')
  })

  it('a result that leaves the opened folder → null', () => {
    expect(joinPath('pages', '../../x.css')).toBeNull()
    expect(joinPath('pages', '/../x.css')).toBeNull()
  })
})

describe('extensionOf', () => {
  it.each([
    ['index.html', 'html'],
    ['INDEX.HTML', 'html'],
    ['css/Style.Min.CSS', 'css'],
    ['archive.tar.gz', 'gz'],
    ['dir.v2/README', ''],
    ['README', ''],
    ['.env', ''],
    ['img/.hidden', ''],
    ['img/.hidden.png', 'png'],
    ['note.', ''],
    ['', ''],
  ])('%j → %j', (path, extension) => {
    expect(extensionOf(path)).toBe(extension)
  })
})

describe('comparePaths', () => {
  it('orders by code units and treats equal paths as equal', () => {
    expect(comparePaths('a', 'b')).toBe(-1)
    expect(comparePaths('b', 'a')).toBe(1)
    expect(comparePaths('a', 'a')).toBe(0)
    // コード単位では、ロケールが何と言おうと大文字が小文字より先に来る
    expect(comparePaths('Z.html', 'a.html')).toBe(-1)
  })

  it('sorts a list of paths', () => {
    expect(['index.html', 'css/a.css', '.env', 'b.html'].sort(comparePaths)).toEqual([
      '.env',
      'b.html',
      'css/a.css',
      'index.html',
    ])
  })
})
