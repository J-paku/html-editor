// 保存していない変更がある間、ページを閉じる・読み直す前に警告するようブラウザに頼む
import { useEffect } from 'react'

// beforeunloadを取り消すと、ブラウザは離れるかを尋ねる
const warn = (event: BeforeUnloadEvent) => {
  event.preventDefault()
}

export function useLeaveWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    if (!hasUnsavedChanges) return
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsavedChanges])
}
