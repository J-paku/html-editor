// start-session.tsのテスト
import { describe, expect, it } from 'vitest'
import { binaryFile, textFile } from './session.test-helper'
import { initialPathOf, isHtmlPath, openSession, startHtmlOf, textPathsOf } from './start-session'

describe('isHtmlPath', () => {
  it.each([
    ['index.html', true],
    ['pages/a.HTM', true],
    ['a.css', false],
    ['html', false],
    ['a.html.bak', false],
  ])('%s → %s', (path, expected) => {
    expect(isHtmlPath(path)).toBe(expected)
  })
})

describe('startHtmlOf', () => {
  it('takes index.html at the top of the folder even when another HTML comes first', () => {
    expect(startHtmlOf(['about.html', 'index.html'])).toBe('index.html')
  })

  it('without index.html at the top, takes the first HTML in path order', () => {
    expect(startHtmlOf(['site.css', 'pages/index.html', 'b.htm', 'a.html'])).toBe('a.html')
  })

  it('is null without any HTML', () => {
    expect(startHtmlOf(['site.css', 'notes.txt'])).toBeNull()
  })
})

describe('textPathsOf', () => {
  it('lists the text files in path order, leaving binary files out', () => {
    expect(textPathsOf([textFile('b.css'), binaryFile('a.png'), textFile('a.html')])).toEqual([
      'a.html',
      'b.css',
    ])
  })
})

describe('initialPathOf', () => {
  it('starts with the start HTML', () => {
    expect(initialPathOf([textFile('about.css'), textFile('index.html')])).toBe('index.html')
  })

  it('without an HTML text file, starts with the first text file in path order', () => {
    expect(initialPathOf([binaryFile('a.html'), textFile('c.css'), textFile('b.js')])).toBe('b.js')
  })

  it('is null without any text file', () => {
    expect(initialPathOf([binaryFile('a.png')])).toBeNull()
  })
})

describe('openSession', () => {
  it('opens on the initial file, with a new opening id each time', () => {
    const files = [textFile('index.html'), binaryFile('a.png')]

    const first = openSession('site', 'folder:site', files)
    const second = openSession('site', 'folder:site', files)

    expect(first).toStrictEqual({
      openId: first?.openId,
      name: 'site',
      projectKey: 'folder:site',
      files,
      activePath: 'index.html',
    })
    expect(typeof first?.openId).toBe('symbol')
    expect(second?.openId).not.toBe(first?.openId)
  })

  it('is null for a project without any text file', () => {
    expect(openSession('images', 'folder:images', [binaryFile('a.png')])).toBeNull()
  })
})
