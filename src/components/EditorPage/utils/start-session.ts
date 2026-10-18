// 開いたばかりのプロジェクトがどのファイルから始まるかと、それを囲んで作るセッション
import { comparePaths, extensionOf } from '@/utils/resolve-path'
import type { Session, SessionFile } from './types'

const HTML_EXTENSIONS = new Set(['html', 'htm'])

export const isHtmlPath = (path: string): boolean => HTML_EXTENSIONS.has(extensionOf(path))

// プロジェクトの最初のHTML。フォルダの一番上のindex.html、無ければパスの順で最初のHTMLのファイル。
// HTMLのファイルが無ければnull
export const startHtmlOf = (paths: readonly string[]): string | null =>
  paths.includes('index.html')
    ? 'index.html'
    : ([...paths].sort(comparePaths).find(isHtmlPath) ?? null)

// 文字のファイルのパス。パスの順
export const textPathsOf = (files: readonly SessionFile[]): string[] =>
  files
    .filter(file => file.kind === 'text')
    .map(file => file.path)
    .sort(comparePaths)

// コード窓に最初に出すファイル。最初のHTML、無ければ最初の文字のファイル。文字のファイルが無ければnull
export const initialPathOf = (files: readonly SessionFile[]): string | null => {
  const paths = textPathsOf(files)
  return startHtmlOf(paths) ?? paths[0] ?? null
}

// 読んだばかりのプロジェクトのセッション。文字のファイルが無ければnull(編集するものが無い)
export const openSession = (
  name: string,
  projectKey: string,
  files: readonly SessionFile[]
): Session | null => {
  const activePath = initialPathOf(files)
  return activePath === null
    ? null
    : { openId: Symbol(projectKey), name, projectKey, files, activePath }
}
