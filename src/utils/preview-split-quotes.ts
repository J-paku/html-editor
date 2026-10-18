// HTML や CSS に書かれたままの値("a.png"・'a.png'・a.png)を、引用符と中の文字に分ける。
// 書き換えが中の文字だけを置き換えて、同じ引用符を戻せるようにするため。
const QUOTES = ['"', `'`]

export type QuotedValue = {
  // 引用符の文字。裸の値なら ''
  quote: string
  inner: string
}

export const splitQuotes = (value: string): QuotedValue => {
  const quote = QUOTES.includes(value[0]) ? value[0] : ''
  return { quote, inner: value.slice(quote.length, value.length - quote.length) }
}
