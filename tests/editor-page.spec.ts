// 配信物(out/)をGitHub Pagesと同じ経路で開くE2E。basePath(/html-editor)を落とした参照は、
// 統合テスト(ビルド無し)では起きず、ビルド結果でしか確かめられない
import { expect, test } from '@playwright/test'
import { strings } from '../content/strings'

test('配信物の /html-editor/ が開き、題名が見え、読み込む資産がどれも返る', async ({ page }) => {
  const failed: string[] = []
  page.on('response', response => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`)
  })

  const response = await page.goto('/html-editor/')

  expect(response?.status(), '入口は 200 で返る').toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: strings.title })).toBeVisible()
  await expect(page).toHaveTitle(strings.title)
  await page.waitForLoadState('networkidle')
  expect(failed, '入口が読み込む css・js はどれも basePath の下で返る').toEqual([])
})
