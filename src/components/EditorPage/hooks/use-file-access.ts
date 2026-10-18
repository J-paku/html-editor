// このブラウザがフォルダを開いて、元のファイルに保存できるか(src/lib/open-project.ts)
import { useSyncExternalStore } from 'react'
import { isFileAccessSupported } from '@/lib/open-project'

// 対応しているかはページを開いている間に変わらないので、聞くものは無い
const unsubscribe = () => undefined
const subscribe = () => unsubscribe

// 静的なHTMLは、道具が対応するブラウザに向けて書く(ボタンは押せる)。ほかのブラウザは、ハイドレーションの直後に
// 案内へ切り替わる
const supportedOnServer = () => true

export function useFileAccessSupport(): boolean {
  return useSyncExternalStore(subscribe, isFileAccessSupported, supportedOnServer)
}
