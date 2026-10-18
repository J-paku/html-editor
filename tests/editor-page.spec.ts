// 配信物(out/)をGitHub Pagesと同じ経路で開くE2E。basePath(/html-editor)を落とした参照は、
// 統合テスト(ビルド無し)では起きず、ビルド結果でしか確かめられない
import { expect, test } from '@playwright/test'
import { strings } from '../content/strings'

test('配信物の /html-editor/ が開き、題名と開始画面が見え、読み込む資産がどれも返る', async ({
  page,
}) => {
  const failed: string[] = []
  page.on('response', response => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`)
  })

  const response = await page.goto('/html-editor/')

  expect(response?.status(), '入口は 200 で返る').toBe(200)
  await expect(page).toHaveTitle(strings.title)
  // 文書の題名(strings.title)と開始画面の見出し(strings.startScreen.productName)は今は同じ字なので、
  // 見出しは開始画面の側の値で引き、開始画面だけにあるもの(説明と2つの開くボタン)も合わせて見る
  const { startScreen } = strings
  await expect(
    page.getByRole('heading', { level: 1, name: startScreen.productName, exact: true })
  ).toBeVisible()
  await expect(page.getByText(startScreen.description, { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: startScreen.openFolder, exact: true })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: startScreen.openFile, exact: true })).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(failed, '入口が読み込む css・js はどれも basePath の下で返る').toEqual([])
})
