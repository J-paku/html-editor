// 問いの窓(衝突の問い・復元の問い)の焦点と全画面の扱い。返すrefは窓を入れる要素に付ける。
//   - 窓が開いたら、data-initial-focusの付いた操作に焦点を置く。全画面なら先に全画面を出てから置く(全画面の要素は窓の後ろの
//     入力を受けない所にあり、窓は全画面の外で見えない。全画面の間は、その外の要素は焦点を受けない)
//   - 開いている間、TabとShift+Tabは窓の中の操作を回る(最後の次は最初、最初の前は最後。後ろの画面やページの外へ出ない)
//   - 閉じたら、開く前に焦点があった要素へ焦点を戻す(その要素がまだ画面にあるとき)
import { useEffect, useRef } from 'react'

// 窓の中でTabが止まる操作
const FOCUSABLE = 'button:not(:disabled), [tabindex="0"]'

export function useDialogFocus(open: boolean) {
  const layer = useRef<HTMLDivElement>(null)
  // 窓の外で最後に焦点を受けた要素
  const before = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const remember = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      if (!layer.current?.contains(target)) before.current = target
    }
    document.addEventListener('focusin', remember)
    return () => document.removeEventListener('focusin', remember)
  }, [])

  useEffect(() => {
    if (!open) return
    const box = layer.current as HTMLDivElement
    const focusInitial = () => (box.querySelector('[data-initial-focus]') as HTMLElement).focus()
    if (document.fullscreenElement === null) focusInitial()
    else document.exitFullscreen().then(focusInitial, focusInitial)
    const wrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const controls = box.querySelectorAll<HTMLElement>(FOCUSABLE)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (document.activeElement !== (event.shiftKey ? first : last)) return
      event.preventDefault()
      const next = event.shiftKey ? last : first
      next.focus()
    }
    document.addEventListener('keydown', wrap)
    return () => {
      document.removeEventListener('keydown', wrap)
      if (before.current?.isConnected) before.current.focus()
    }
  }, [open])

  return layer
}
