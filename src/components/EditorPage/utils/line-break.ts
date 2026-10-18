// 原本の改行を、文書の状態(EditorState)へ入れて取り出したときに1字も変えないための決め方。
// CodeMirror は既定で \r\n・\r・\n のどれでも行を分け、文字にするときは \n でつなぐ。そのままだと CRLF の原本が
// 保存で LF に変わる(design.md の「保存すると原本の形が変わる」)。そこで原本の改行の形から、行の分け方とつなぎ方を選ぶ。
//   - \r が1つも無い: 既定で分け、\n でつなぐ。貼り付けた CRLF は LF にそろう
//   - 改行が全部 \r\n: 既定で分け、\r\n でつなぐ。Enter で足した行も \r\n で書き出される
//   - それ以外(\r\n と \n が混ざる・\r だけの改行がある): \n だけで分け、\r は行の中の字として残す。\n でつなぐと元に戻る
// 純粋関数。CodeMirror への当て方は ./doc-state.ts が持つ

export type LineBreak = {
  // true なら \n だけで行を分ける(\r は行の中の字として残す)。false なら CodeMirror の既定(\r\n・\r・\n)
  splitOnLfOnly: boolean
  // 文書を文字に戻すときに、行の間へ \r\n を入れるか(false なら \n)
  joinWithCrlf: boolean
}

// \n の付かない \r か、\r の後でない \n(\r\n でない改行)
const LONE_BREAK = /\r(?!\n)|(?<!\r)\n/

// 原本 text の改行の形に合う、行の分け方とつなぎ方
export const lineBreakOf = (text: string): LineBreak => {
  if (!text.includes('\r')) return { splitOnLfOnly: false, joinWithCrlf: false }
  if (!LONE_BREAK.test(text)) return { splitOnLfOnly: false, joinWithCrlf: true }
  return { splitOnLfOnly: true, joinWithCrlf: false }
}
