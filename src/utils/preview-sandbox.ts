// プレビューの iframe の sandbox。開いた HTML のスクリプトは走るが、allow-same-origin が無いので文書は
// 不透明なオリジンを持ち、編集器の IndexedDB・フォルダのハンドル・DOM に届かない(docs/design.md の「위험」1)。
// 2026-10-18 に Chromium 153 で実測: 同じオリジンのプレビューは編集器の IndexedDB と parent.document を読めたが、
// この sandbox のプレビューはどちらも SecurityError になった。
export const PREVIEW_SANDBOX = 'allow-scripts'
