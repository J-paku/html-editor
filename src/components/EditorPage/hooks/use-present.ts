// プレビューを全画面で見せる(道具の棚の「全画面で表示」)。Fullscreen APIを使う。targetはプレビューを囲む要素に付け、
// ブラウザが断ったら知らせる。全画面になったら焦点をプレビューの中へ入れる。押したボタンは見せているものの外に残り、
// 矢印キーやSpaceがスライドではなくそのボタンへ行ってしまうため
import { useRef } from 'react'
import type { Report } from './use-notice'

export function usePresent(report: Report) {
  const target = useRef<HTMLDivElement>(null)
  const present = () => {
    // 囲む要素は道具の棚と一緒に描かれ、プレビューが無い間は「全画面で表示」を切ってある
    const box = target.current
    box
      ?.requestFullscreen()
      .then(() => box.querySelector('iframe')?.focus(), report('presentFailed'))
  }
  return { target, present }
}
