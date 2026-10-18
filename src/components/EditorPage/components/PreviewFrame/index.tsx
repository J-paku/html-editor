// プレビューのiframe(表示部品。フックを呼ばない)。開いたHTMLのプレビュー用の写しをsrcdocとして受け取り
// (src/utils/preview-build-srcdoc.ts)、不透明なオリジンのsandbox(src/utils/preview-sandbox.ts)の中で走らせる。
// sandboxはここで固定し、propにしないので、呼ぶ側が広げることはできない
import { PREVIEW_SANDBOX } from '@/utils/preview-sandbox'
import styles from './preview-frame.module.css'

export type PreviewFrameProps = {
  // 走らせるHTML(buildPreviewSrcdocの戻り値)
  srcdoc: string
  // iframeのアクセシブルな名前(content/から)
  title: string
}

function PreviewFrame({ srcdoc, title }: PreviewFrameProps) {
  return <iframe className={styles.frame} sandbox={PREVIEW_SANDBOX} srcDoc={srcdoc} title={title} />
}

export default PreviewFrame
