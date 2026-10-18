// catchした値が、与えた名前のエラーか。
// ファイルのピッカーとハンドルは、AbortError(ピッカーが閉じられた)やNotFoundError(ファイルが無くなった)
// のようなDOMExceptionの名前でrejectする
export const isErrorNamed = (error: unknown, name: string): error is Error =>
  error instanceof Error && error.name === name
