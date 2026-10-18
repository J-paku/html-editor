// 開いたフォルダを読むときに出会う項目をどう扱うか。どのファイルが文字か、どのフォルダを飛ばすか
import { extensionOf } from './resolve-path'

export type FileKind = 'text' | 'binary'

// 編集できる文字として読む拡張子。ほかのファイルは全部バイトのまま持ち、文字にしない。
// そのため保存してもバイトに戻し直すことは決して無い
const TEXT_EXTENSIONS = new Set([
  'html',
  'htm',
  'css',
  'js',
  'mjs',
  'cjs',
  'json',
  'svg',
  'txt',
  'md',
  'xml',
  'csv',
])

export const fileKindOf = (path: string): FileKind =>
  TEXT_EXTENSIONS.has(extensionOf(path)) ? 'text' : 'binary'

// 読まないフォルダ。パッケージと、名前がドットで始まる全部のフォルダ(.git・.vscode・.cache)
const SKIPPED_FOLDERS = new Set(['node_modules'])

export const isSkippedFolder = (name: string): boolean =>
  name.startsWith('.') || SKIPPED_FOLDERS.has(name)
