// 各ファイルの文書の状態(CodeMirrorのEditorState)を作り、読み、動かす純粋関数。
// 正本は各ファイルの原本の文字で、状態はその文字と元に戻す記録を持つ。
// クリックの編集とコードの編集は1つの記録を共有し、記録はファイルごとに分かれる(design.mdの「잘못 고침」)。
// 最後に保存した文字は状態の外に持つ(セッションのファイルのsavedDoc、./types.ts)。そのため保存はコード窓に新しい状態を
// 渡さない。入力の途中(IMEの変換中)にviewの状態を差し替えると、入力しているものが壊れる。ディスクの版を取るときは
// createDocStateで新しい状態を作る(記録は空から始まる)
import {
  defaultKeymap,
  history,
  historyKeymap,
  invertedEffects,
  isolateHistory,
  redo,
  redoDepth,
  undo,
  undoDepth,
} from '@codemirror/commands'
import { syntaxHighlighting } from '@codemirror/language'
import {
  EditorState,
  Facet,
  StateEffect,
  StateField,
  type Extension,
  type StateCommand,
  type Text,
} from '@codemirror/state'
import { keymap, lineNumbers } from '@codemirror/view'
import { classHighlighter } from '@lezer/highlight'
import type { FileFingerprint } from '@/utils/compare-fingerprint'
import { lineBreakOf, type LineBreak } from './line-break'
import { pickLanguage } from './pick-language'

// 文書を文字に戻すときに、行の間へ \r\n を入れるか(./line-break.ts の joinWithCrlf)
const joinWithCrlf = Facet.define<boolean, boolean>({ combine: values => values[0] })

const lineBreakExtension = (lineBreak: LineBreak): Extension => [
  joinWithCrlf.of(lineBreak.joinWithCrlf),
  lineBreak.splitOnLfOnly ? EditorState.lineSeparator.of('\n') : [],
]

// 一時保管から復元した文字の出どころ。draftはその下書きを作ったときのファイルの版、diskは復元した時にディスクから読んであった版
export type RestoredBase = { draft: FileFingerprint; disk: FileFingerprint }

const setRestoredBase = StateEffect.define<RestoredBase | null>()

// 今の文字が復元した下書きを含むなら、その出どころ(含まなければnull)。状態の中に持つので、元に戻す・やり直すについて動く
const restoredBase = StateField.define<RestoredBase | null>({
  create: () => null,
  update: (value, transaction) =>
    transaction.effects.reduce(
      (next, effect) => (effect.is(setRestoredBase) ? effect.value : next),
      value
    ),
})

// 出どころを変えた変更を元に戻すと、その前の出どころに戻る(やり直すと、また変えた後の出どころになる)
const invertRestoredBase = invertedEffects.of(transaction =>
  transaction.effects.some(effect => effect.is(setRestoredBase))
    ? [setRestoredBase.of(transaction.startState.field(restoredBase))]
    : []
)

// textを持つ、pathのファイルの状態。言語は拡張子で決まり、記録は空から始まり、構文の字句にはtok-で始まるクラスが付く
// (classHighlighter。色はコード窓のスタイルシートにある)。
// そのdoc(state.doc)は、読んだばかりのファイルの保存した時点の文書
export const createDocState = (path: string, text: string): EditorState =>
  EditorState.create({
    doc: text,
    extensions: [
      lineBreakExtension(lineBreakOf(text)),
      pickLanguage(path),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      lineNumbers(),
      syntaxHighlighting(classHighlighter),
      restoredBase,
      invertRestoredBase,
    ],
  })

// 今の文字。原本の改行の形のまま返す(createDocState に渡した文字は、編集しなければこの関数で1字も変わらずに戻る)
export const docText = (state: EditorState): string =>
  state.doc.sliceString(0, state.doc.length, state.facet(joinWithCrlf) ? '\r\n' : '\n')

// 文字がsavedDoc(保存した時点の文書。savedDocOfを参照)と違うか。元に戻して同じ文字になれば、変わっていない扱い
export const isDirty = (state: EditorState, savedDoc: Text): boolean => !state.doc.eq(savedDoc)

// savedTextを書いた後の、保存した時点の文書。stateが自分の文字を分けるのと同じに行を分ける(isDirtyが同じもの同士を
// 比べるように)。書き込みの間に進んだ入力は、変わったまま残る。状態そのものはそのまま
export const savedDocOf = (state: EditorState, savedText: string): Text => state.toText(savedText)

// 全部の文字を復元した下書きの文字(text)に置き換える。前後の入力とまとめず、それだけで元に戻せる1歩にする。
// baseは下書きの出どころで、この1歩を元に戻すと消え、やり直すとまた付く
export const restoreDoc = (state: EditorState, text: string, base: RestoredBase): EditorState =>
  state.update({
    changes: { from: 0, to: state.doc.length, insert: text },
    effects: setRestoredBase.of(base),
    annotations: isolateHistory.of('full'),
  }).state

// 今の文字が含む、復元した下書きの出どころ。含まなければnull
export const restoredBaseOf = (state: EditorState): RestoredBase | null => state.field(restoredBase)

// CodeMirror の命令を { state, dispatch } で呼び、出てきた状態を返す。命令が何もしなければ元の状態のまま
const runCommand = (state: EditorState, command: StateCommand): EditorState => {
  let next = state
  command({
    state,
    dispatch: transaction => {
      next = transaction.state
    },
  })
  return next
}

// 元に戻す。戻すものが無ければ同じ状態
export const undoDoc = (state: EditorState): EditorState => runCommand(state, undo)

// やり直す。やり直すものが無ければ同じ状態
export const redoDoc = (state: EditorState): EditorState => runCommand(state, redo)

// 元に戻せるものがあるか(道具の棚のボタンの押せる・押せないに使う)
export const canUndo = (state: EditorState): boolean => undoDepth(state) > 0

// やり直せるものがあるか
export const canRedo = (state: EditorState): boolean => redoDepth(state) > 0
