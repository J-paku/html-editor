// 画面に出す文字列の集まり(AGENTS.mdの不変ルール1: 表示文字列はcontent/ の外に書かない)。
// 画面の言語はまだ決めていないので、今は題名(製品の名前)と、仮の言語だけを置く枠。
// 読んでよいのはsrc/lib/content/ だけ(eslint.config.mjs)
import type { Strings } from './types/strings'

export const strings: Strings = {
  lang: 'ja',
  title: 'html-editor',
}
