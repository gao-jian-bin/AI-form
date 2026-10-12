import { expect, test } from '@playwright/test'

test('home displays topic posts and uses Pandora as its browser title', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page).toHaveTitle('Pandora')
  await expect(page.getByRole('heading', { name: '主题帖子', exact: true })).toBeVisible()
  const home = page.getByRole('link', { name: '主题帖子', exact: true })
  await expect(home).toBeVisible()
  await expect(page.getByRole('button', { name: '搜索', exact: true })).toBeEnabled()
  await page.getByRole('link', { name: 'ChatGPT', exact: true }).first().click()
  await expect(page).toHaveURL(/\/c\/chatgpt/)
  await expect(page).not.toHaveTitle('Pandora')
  await home.click()
  await expect(page).toHaveTitle('Pandora')
  expect(errors).toEqual([])
  if (process.env.BRANDING_QA_SCREENSHOT) {
    await page.screenshot({ path: process.env.BRANDING_QA_SCREENSHOT })
  }
})
