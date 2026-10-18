// ファイルのパスの拡張子から、コード窓で使う CodeMirror の言語を選ぶ。純粋関数
import type { Extension } from '@codemirror/state'
import type { LanguageSupport } from '@codemirror/language'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'

// 拡張子(小文字)→ 言語。プロトタイプの名前(constructor など)を拾わないよう Map で引く
const LANGUAGES = new Map<string, () => LanguageSupport>([
  ['html', html],
  ['htm', html],
  ['css', css],
  ['js', javascript],
  ['mjs', javascript],
  ['cjs', javascript],
])

// path の最後の . より後ろ(大文字小文字を問わない)で言語を選ぶ。知らない拡張子は言語なし(ただの文字として見せる)。
// フォルダの名前の . の後ろは / を含むので、どの拡張子にも当たらない
export const pickLanguage = (path: string): Extension =>
  LANGUAGES.get(path.slice(path.lastIndexOf('.') + 1).toLowerCase())?.() ?? []
