import { expect, test } from '@playwright/test'

test('public visitors can browse topics without account controls', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '最新主题' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'ChatGPT', exact: true }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: '工具箱', exact: true }).first()).toBeVisible()
  await expect(page.getByText('Squoosh：在浏览器里压缩图片').first()).toBeVisible()
  await expect(page.getByRole('link', { name: /登录|注册|发帖/ })).toHaveCount(0)
})

test('owner can create a draft that stays out of the public topic stream', async ({ page }) => {
  const title = `端到端草稿 ${Date.now()}`
  await page.goto('/studio')
  await expect(page).toHaveURL(/\/studio\/sign-in$/)

  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await page.getByRole('link', { name: '＋ 新建主题' }).click()
  await page.getByLabel('标题').fill(title)
  await page.getByLabel('正文 · Markdown').fill('# 自动化验收\n\n这篇内容只能在管理工作台看到。')
  await page.getByRole('button', { name: '保存草稿' }).click()

  await expect(page).toHaveURL(/\/studio$/)
  await expect(page.getByText(title, { exact: true })).toBeVisible()

  await page.goto('/')
  await expect(page.getByText(title, { exact: true })).toHaveCount(0)
})
