// libのテストのための、メモリの中だけのindexedDB(nodeには無い)。あるのはidb-keyvalが呼ぶものだけ: open(新しい
// データベースにストアを作るupgradeを含む)、1つのストアのトランザクション、put・delete・getAll・getAllKeys。
// 値は、IndexedDBと同じく入れるときと出すときにstructuredCloneで写す。
// factoryをvi.stubGlobal('indexedDB', …)に渡す。ほかのメンバーは中を覗くか、記録をじかに書く

// ただのデータだけ: これらのテストが残す値
export type StoredValue = object | string | number | boolean | null

type Stored = { key: IDBValidKey; value: StoredValue }
type Records = Map<string, Stored>
type Handler = (() => void) | null

// 後の順番で走らせる。IndexedDBは要求に非同期で答えるため
const later = (run: () => void) => {
  setTimeout(run, 0)
}

const succeed = <T>(result: T) => {
  const request = { result, error: null, onsuccess: null as Handler, onerror: null as Handler }
  later(() => request.onsuccess?.())
  return request
}

// 記録は直列化したキーで探すので、配列のキーはIndexedDBと同じくその要素で比べられる
const keyId = (key: IDBValidKey) => JSON.stringify(key)

const transactionOn = (records: Records) => {
  const transaction = {
    error: null,
    oncomplete: null as Handler,
    onerror: null as Handler,
    onabort: null as Handler,
    objectStore: () => store,
  }
  const store = {
    transaction,
    put: (value: StoredValue, key: IDBValidKey) => {
      records.set(keyId(key), { key, value: structuredClone(value) })
      return succeed(key)
    },
    delete: (key: IDBValidKey) => {
      records.delete(keyId(key))
      return succeed(undefined)
    },
    getAll: () => succeed([...records.values()].map(({ value }) => structuredClone(value))),
    getAllKeys: () => succeed([...records.values()].map(({ key }) => key)),
  }
  // 同じ順番で出した要求が成功した後に完了する
  later(() => later(() => transaction.oncomplete?.()))
  return transaction
}

export const createFakeIndexedDb = () => {
  // データベースの名前 → ストアの名前 → 記録
  const databases = new Map<string, Map<string, Records>>()

  const storesOf = (name: string) => {
    const stores = databases.get(name) ?? new Map<string, Records>()
    databases.set(name, stores)
    return stores
  }

  const open = (name: string) => {
    const request = {
      result: null as object | null,
      error: null,
      onupgradeneeded: null as Handler,
      onsuccess: null as Handler,
      onerror: null as Handler,
    }
    later(() => {
      const isNew = !databases.has(name)
      const stores = storesOf(name)
      request.result = {
        onclose: null,
        createObjectStore: (storeName: string) => {
          stores.set(storeName, new Map())
        },
        transaction: (storeName: string) => {
          const records = stores.get(storeName)
          if (records === undefined) {
            throw new DOMException(`no store ${storeName}`, 'NotFoundError')
          }
          return transactionOn(records)
        },
      }
      if (isNew) request.onupgradeneeded?.()
      request.onsuccess?.()
    })
    return request
  }

  return {
    factory: { open },
    // データベースとそのストアの名前。{ database: [store, …] }の形
    layout: () =>
      Object.fromEntries([...databases].map(([name, stores]) => [name, [...stores.keys()]])),
    // 1つのストアの全部の記録。[key, value]の形
    records: (database: string, store: string) =>
      [...(databases.get(database)?.get(store)?.values() ?? [])].map(({ key, value }) => [
        key,
        value,
      ]),
    // テストするコードを通さずに、記録をじかに書く(古い形や壊れた形の記録のため)
    seed: (database: string, store: string, key: IDBValidKey, value: StoredValue) => {
      const stores = storesOf(database)
      const records = stores.get(store) ?? new Map<string, Stored>()
      stores.set(store, records)
      records.set(keyId(key), { key, value })
    },
  }
}
