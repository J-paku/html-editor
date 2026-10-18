// ファイルごとの文書の状態(doc-state.ts)のテスト。作った状態の言語・キーの割り当て、原本の文字が1字も変わらずに戻ること、
// 保存した時点の文字との比べ方、元に戻す・やり直すを見る
import { EditorState, StateEffect } from '@codemirror/state'
import { highlightingFor, language } from '@codemirror/language'
import { keymap } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { describe, expect, it } from 'vitest'
import {
  canRedo,
  canUndo,
  createDocState,
  docText,
  isDirty,
  redoDoc,
  restoreDoc,
  restoredBaseOf,
  savedDocOf,
  undoDoc,
} from './doc-state'

// 文書の終わりに insert を足した状態(利用者の入力の代わり)
const append = (state: EditorState, insert: string) =>
  state.update({ changes: { from: state.doc.length, insert } }).state

describe('createDocState', () => {
  it('パスの拡張子で言語を選ぶ', () => {
    expect(createDocState('index.html', '').facet(language)?.name).toBe('html')
    expect(createDocState('site.css', '').facet(language)?.name).toBe('css')
    expect(createDocState('notes.txt', '').facet(language)).toBeNull()
  })

  it('基本のキーの割り当て(Enter など)と、元に戻す・やり直すのキーを持つ', () => {
    const keys = createDocState('index.html', '')
      .facet(keymap)
      .flat()
      .map(binding => binding.key)
    expect(keys).toContain('Enter')
    expect(keys).toContain('Mod-z')
    expect(keys).toContain('Mod-y')
  })

  it('作ったばかりの状態は、作った文字から変わっておらず、元に戻す・やり直すものも無い', () => {
    const state = createDocState('index.html', '<p>a</p>')
    expect(isDirty(state, state.doc)).toBe(false)
    expect(canUndo(state)).toBe(false)
    expect(canRedo(state)).toBe(false)
  })

  it('構文の字句に tok- で始まるクラスを付ける', () => {
    expect(highlightingFor(createDocState('index.html', ''), [tags.tagName])).toBe('tok-typeName')
  })
})

describe('docText', () => {
  it.each([
    ['空の文字', ''],
    ['改行の無い文字', '<p>a</p>'],
    ['LF', '<ul>\n  <li>a</li>\n</ul>\n'],
    ['CRLF', '<ul>\r\n  <li>a</li>\r\n</ul>\r\n'],
    ['CRLF と LF が混ざる', '<ul>\r\n  <li>a</li>\n</ul>\r\n'],
    ['CR だけの改行', '<ul>\r  <li>a</li>\r</ul>'],
    ['CRLF の前に CR が重なる', 'a\r\r\nb\r\n'],
    ['空の行が続く', '\n\n\na\n\n'],
    ['BOM 付きの LF', '﻿<p>a</p>\n'],
    ['BOM 付きの CRLF', '﻿<p>a</p>\r\n<p>b</p>\r\n'],
  ])('編集しなければ、作るときに渡した文字(%s)が1字も変わらずに戻る', (_, text) => {
    expect(docText(createDocState('index.html', text))).toBe(text)
  })

  it('BOM 付きの CRLF の原本を開いて何も直さなければ、その文字の保存した時点の文書と比べて変わっていない扱いで、文字も同じ', () => {
    const text = '﻿<ul>\r\n  <li>a</li>\r\n</ul>\r\n'
    const state = createDocState('index.html', text)
    expect(isDirty(state, savedDocOf(state, text))).toBe(false)
    expect(docText(state)).toBe(text)
  })

  it.each([
    ['BOM 付きの CRLF', '﻿<ul>\r\n  <li>a</li>\r\n</ul>\r\n', '﻿<ul>\r\n  <li>b</li>\r\n</ul>\r\n'],
    ['LF', '<ul>\n  <li>a</li>\n</ul>\n', '<ul>\n  <li>b</li>\n</ul>\n'],
  ])('1字直した後も、ほかの所の改行と BOM は原本のまま(%s)', (_, text, expected) => {
    const state = createDocState('index.html', text)
    const at = state.doc.line(2).from + '  <li>'.length
    const edited = state.update({ changes: { from: at, to: at + 1, insert: 'b' } }).state
    expect(docText(edited)).toBe(expected)
  })

  it('LF の文書に足した CRLF は LF にそろう', () => {
    expect(docText(append(createDocState('index.html', 'a\nb'), '\r\nc'))).toBe('a\nb\nc')
  })

  it('CRLF の文書に足した改行は CRLF で書き出す', () => {
    expect(docText(append(createDocState('index.html', 'a\r\nb'), '\nc'))).toBe('a\r\nb\r\nc')
  })

  it('改行が混ざる文書は、足した改行も CR もそのまま書き出す', () => {
    expect(docText(append(createDocState('index.html', 'a\r\nb\nc'), '\nd\r\ne'))).toBe(
      'a\r\nb\nc\nd\r\ne'
    )
  })
})

describe('isDirty と savedDocOf', () => {
  it('編集すると変わった扱いになり、元に戻して同じ文字になれば変わっていない扱いに戻る', () => {
    const state = createDocState('index.html', 'a')
    const edited = append(state, 'b')
    expect(isDirty(edited, state.doc)).toBe(true)
    expect(isDirty(undoDoc(edited), state.doc)).toBe(false)
  })

  it.each([
    ['LF', 'a\nb'],
    ['CRLF', 'a\r\nb'],
    ['改行が混ざる', 'a\r\nb\nc'],
  ])('書き込んだ今の文字(%s)の保存した時点の文書と比べると、変わっていない扱い', (_, text) => {
    const edited = append(createDocState('index.html', text), '\nz')
    expect(isDirty(edited, savedDocOf(edited, docText(edited)))).toBe(false)
  })

  it('書き込みの間に入力が進んでいれば、その分は変わったまま残る', () => {
    const writing = append(createDocState('index.html', 'a'), 'b')
    const saved = savedDocOf(writing, docText(writing))
    expect(isDirty(append(writing, 'c'), saved)).toBe(true)
  })

  it('保存の後に元に戻すと、保存した時点の文字と比べて変わった扱いになる', () => {
    const edited = append(createDocState('index.html', 'a'), 'b')
    const saved = savedDocOf(edited, 'ab')
    const undone = undoDoc(edited)
    expect(docText(undone)).toBe('a')
    expect(isDirty(undone, saved)).toBe(true)
  })
})

describe('undoDoc と redoDoc', () => {
  it('戻すもの・やり直すものが無ければ、同じ状態を返す', () => {
    const state = createDocState('index.html', 'a')
    expect(undoDoc(state)).toBe(state)
    expect(redoDoc(state)).toBe(state)
  })

  it('編集を元に戻し、やり直す', () => {
    const edited = append(createDocState('index.html', 'a'), 'b')
    expect(canUndo(edited)).toBe(true)
    expect(canRedo(edited)).toBe(false)

    const undone = undoDoc(edited)
    expect(docText(undone)).toBe('a')
    expect(canUndo(undone)).toBe(false)
    expect(canRedo(undone)).toBe(true)

    const redone = redoDoc(undone)
    expect(docText(redone)).toBe('ab')
    expect(canUndo(redone)).toBe(true)
    expect(canRedo(redone)).toBe(false)
  })

  it('記録はファイル(状態)ごとに分かれる', () => {
    const page = append(createDocState('index.html', 'a'), 'b')
    const style = createDocState('site.css', 'body {}')
    expect(canUndo(page)).toBe(true)
    expect(canUndo(style)).toBe(false)
    expect(undoDoc(style)).toBe(style)
  })
})

describe('restoreDoc と restoredBaseOf', () => {
  const base = { draft: { lastModified: 1, size: 2 }, disk: { lastModified: 3, size: 4 } }

  it('作ったばかりの状態は、復元した下書きを含まない', () => {
    expect(restoredBaseOf(createDocState('index.html', 'a'))).toBeNull()
  })

  it('全部の文字を下書きの文字に置き換えて出どころを付け、続けて入力しても出どころは残る', () => {
    const restored = restoreDoc(createDocState('index.html', 'a\r\nb'), 'kept\r\n', base)
    expect(docText(restored)).toBe('kept\r\n')
    expect(restoredBaseOf(restored)).toBe(base)
    expect(restoredBaseOf(append(restored, 'x'))).toBe(base)
  })

  it('元に戻すと復元の前の文字と出どころ無しに戻り、やり直すとまた付く', () => {
    const restored = restoreDoc(createDocState('index.html', 'a'), 'kept', base)
    const undone = undoDoc(restored)
    expect(docText(undone)).toBe('a')
    expect(restoredBaseOf(undone)).toBeNull()
    const redone = redoDoc(undone)
    expect(docText(redone)).toBe('kept')
    expect(restoredBaseOf(redone)).toBe(base)
  })

  it('直前の入力とまとめず、元に戻すのは復元の1歩だけ', () => {
    const typed = append(createDocState('index.html', 'a'), 'b')
    const undone = undoDoc(restoreDoc(typed, 'kept', base))
    expect(docText(undone)).toBe('ab')
    expect(restoredBaseOf(undone)).toBeNull()
  })

  it('復元の後の入力を元に戻しても、出どころは残る', () => {
    const restored = restoreDoc(createDocState('index.html', 'a'), 'kept', base)
    expect(restoredBaseOf(undoDoc(append(restored, 'x')))).toBe(base)
  })

  it('ほかの効果(構文の読み取りの進みなど)は出どころを変えない', () => {
    const other = StateEffect.define<number>()
    const restored = restoreDoc(createDocState('index.html', 'a'), 'kept', base)
    expect(restoredBaseOf(restored.update({ effects: other.of(1) }).state)).toBe(base)
  })

  it('カーソルを動かしただけでは、元に戻すものは増えない', () => {
    const moved = createDocState('index.html', 'ab').update({ selection: { anchor: 1 } }).state
    expect(canUndo(moved)).toBe(false)
  })
})
