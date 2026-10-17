// out/ をGitHub Pagesのプロジェクトページと同じ形で配る静的サーバ(E2EのwebServerとnpm run start)。
// 本番はhttps://j-paku.github.io/html-editor/ なので、out/ の中身をbasePath(next.config.tsの正本)の下に置いて配る。
// 根(/)に置いて配ると、basePathを落とした参照(/_next/… など)も読めてしまい、本番で壊れる参照をE2Eが見逃すため。
//
// 配り方(GitHub Pagesに合わせる):
//   - basePathの外は404(out/ の中身は出さない)
//   - フォルダはindex.htmlを返す。末尾のスラッシュが無いフォルダ(/html-editorなど)は、スラッシュを付けた経路へ301で移す
//   - 無い経路はout/404.htmlを404で返す
//   - GETとHEADだけを受ける
//
// 使い方: node scripts/serve-out.mjs [--port <番号>](既定はE2E_PORTか4317)
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nextConfig from '../next.config.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'out')
const BASE_PATH = nextConfig.basePath ?? ''
const NOT_FOUND_PAGE = path.join(OUT, '404.html')

// 拡張子 → Content-Type。ここに無い拡張子はapplication/octet-streamで返す
const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
  ['.webmanifest', 'application/manifest+json'],
])

const portArg = process.argv.indexOf('--port')
const PORT = Number(portArg === -1 ? (process.env.E2E_PORT ?? 4317) : process.argv[portArg + 1])
if (!Number.isInteger(PORT) || PORT <= 0) {
  console.error(`serve-out: ポートの番号が正しくない: ${process.argv[portArg + 1]}`)
  process.exit(1)
}
if (!existsSync(path.join(OUT, 'index.html'))) {
  console.error('serve-out: out/index.html が無い。先に npm run build を実行すること')
  process.exit(1)
}

const statOf = file => statSync(file, { throwIfNoEntry: false })

const sendFile = (request, response, status, file) => {
  const type = TYPES.get(path.extname(file)) ?? 'application/octet-stream'
  response.writeHead(status, { 'Content-Type': type, 'Content-Length': statOf(file).size })
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  createReadStream(file).pipe(response)
}

const sendNotFound = (request, response) => {
  if (existsSync(NOT_FOUND_PAGE)) {
    sendFile(request, response, 404, NOT_FOUND_PAGE)
    return
  }
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  response.end('404')
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' })
    response.end()
    return
  }
  const { pathname } = new URL(request.url ?? '/', `http://localhost:${PORT}`)
  if (pathname !== BASE_PATH && !pathname.startsWith(`${BASE_PATH}/`)) {
    sendNotFound(request, response)
    return
  }
  let relative
  try {
    relative = decodeURIComponent(pathname.slice(BASE_PATH.length))
  } catch {
    sendNotFound(request, response)
    return
  }
  const target = path.join(OUT, relative)
  // .. でout/ の外へ出る経路は、無い経路として扱う
  if (target !== OUT && !target.startsWith(`${OUT}${path.sep}`)) {
    sendNotFound(request, response)
    return
  }
  const stat = statOf(target)
  if (stat?.isDirectory()) {
    if (!pathname.endsWith('/')) {
      response.writeHead(301, { Location: `${pathname}/` })
      response.end()
      return
    }
    const index = path.join(target, 'index.html')
    if (statOf(index)?.isFile()) sendFile(request, response, 200, index)
    else sendNotFound(request, response)
    return
  }
  if (stat?.isFile()) sendFile(request, response, 200, target)
  else sendNotFound(request, response)
})

server.on('error', error => {
  console.error(`serve-out: :${PORT} で配信を始められない(${error.message})`)
  process.exit(1)
})
server.listen(PORT, () => {
  console.log(`serve-out: out/ を http://localhost:${PORT}${BASE_PATH}/ で配信中`)
})
