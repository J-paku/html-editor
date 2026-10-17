// contentの読み口。content/ の実データを読んでよいのはこのsrc/lib/content/ だけ(eslint.config.mjs)。
// サーバ(ビルド)専用 — クライアントへ持ち込むとserver-onlyがimportの時点で落とす
import 'server-only'
import type { Strings } from '@content/types/strings'
import { strings } from '@content/strings'

export const readStrings = (): Strings => strings
