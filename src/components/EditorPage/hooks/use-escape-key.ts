// activeの間にEscapeキーが押されたらonEscapeを呼ぶ(問いの窓が開いている間。答えずに抜ける道)。
// 文書全体で聞くので、焦点がどこにあってもキーが効く。窓の背景をクリックして焦点がページに残った後も同じ
import { useEffect } from 'react'

export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape()
    }
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [active, onEscape])
}
