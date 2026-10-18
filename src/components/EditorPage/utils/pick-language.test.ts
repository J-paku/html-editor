// 拡張子から CodeMirror の言語を選ぶ(pick-language.ts)のテスト。選んだ言語を状態に入れ、状態が持つ言語の名前で見る
import { EditorState } from '@codemirror/state'
import { language } from '@codemirror/language'
import { describe, expect, it } from 'vitest'
import { pickLanguage } from './pick-language'

// path の言語を入れた状態の、言語の名前(言語なしなら undefined)
const languageNameOf = (path: string) =>
  EditorState.create({ extensions: pickLanguage(path) }).facet(language)?.name

describe('pickLanguage', () => {
  it.each([
    ['index.html', 'html'],
    ['page.htm', 'html'],
    ['styles/site.css', 'css'],
    ['app.js', 'javascript'],
    ['module.mjs', 'javascript'],
    ['config.cjs', 'javascript'],
  ])('%s は %s', (path, name) => {
    expect(languageNameOf(path)).toBe(name)
  })

  it('拡張子の大文字小文字を問わない', () => {
    expect(languageNameOf('INDEX.HTML')).toBe('html')
    expect(languageNameOf('Site.Css')).toBe('css')
  })

  it('最後の . より後ろだけを拡張子として見る', () => {
    expect(languageNameOf('vendor/app.min.js')).toBe('javascript')
    expect(languageNameOf('assets.v2/site.css')).toBe('css')
    expect(languageNameOf('index.html.bak')).toBeUndefined()
  })

  it.each([
    ['知らない拡張子', 'notes.txt'],
    ['拡張子が無い', 'README'],
    ['フォルダの名前にだけ . がある', 'site.css/LICENSE'],
    ['. で終わる', 'index.'],
    ['プロトタイプの名前', 'a.constructor'],
  ])('%s(%s)は言語なし', (_, path) => {
    expect(pickLanguage(path)).toEqual([])
    expect(languageNameOf(path)).toBeUndefined()
  })
})
