// どのファイルを文字として読み、どのフォルダを飛ばすか
import { describe, expect, it } from 'vitest'
import { fileKindOf, isSkippedFolder } from './classify-entry'

describe('fileKindOf', () => {
  it.each([
    'index.html',
    'page.htm',
    'css/style.css',
    'js/app.js',
    'js/app.mjs',
    'js/app.cjs',
    'data.json',
    'img/icon.svg',
    'notes.txt',
    'README.md',
    'feed.xml',
    'table.csv',
  ])('%j is text', path => {
    expect(fileKindOf(path)).toBe('text')
  })

  it('looks at the extension whatever its case', () => {
    expect(fileKindOf('INDEX.HTML')).toBe('text')
  })

  it.each(['img/logo.png', 'photo.jpg', 'font.woff2', 'movie.mp4', 'LICENSE', '.env', 'html'])(
    '%j is binary',
    path => {
      expect(fileKindOf(path)).toBe('binary')
    }
  )
})

describe('isSkippedFolder', () => {
  it.each(['.git', '.vscode', '.cache', '.', 'node_modules'])('%j is skipped', name => {
    expect(isSkippedFolder(name)).toBe(true)
  })

  it.each(['src', 'css', 'img', 'node_modules_backup', 'my.git'])('%j is read', name => {
    expect(isSkippedFolder(name)).toBe(false)
  })
})
