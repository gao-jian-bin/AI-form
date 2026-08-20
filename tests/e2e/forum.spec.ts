import { expect, test } from '@playwright/test'

test('public visitors can browse topics without account controls', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('link', { name: 'AI 知识论坛' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '主题' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '浏览' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: '活动' })).toBeVisible()
  await expect(page.getByText('Squoosh：在浏览器里压缩图片').first()).toBeVisible()
  await expect(page.getByText('Squoosh 可以直观比较压缩前后的画质和体积').first()).toHaveCount(0)
  await expect(page.getByRole('link', { name: /登录|注册|发帖/ })).toHaveCount(0)
})

test('mobile layout opens the source-shaped sidebar without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await page.getByRole('button', { name: '打开导航菜单' }).click()
  const sidebar = page.getByRole('complementary', { name: '论坛导航' })
  await expect(sidebar).toBeVisible()
  await expect(sidebar.getByRole('link', { name: /^ChatGPT/ })).toBeVisible()
  await expect(sidebar.getByRole('link', { name: /^工具箱/ })).toBeVisible()
  const tagToggle = sidebar.getByRole('button', { name: '标签' })
  await expect(tagToggle).toHaveAttribute('aria-expanded', 'false')
  await tagToggle.click()
  await expect(sidebar.getByRole('link', { name: /Base64/ })).toBeVisible()
  await sidebar.getByRole('link', { name: /Prompt/ }).click()
  await expect(page).toHaveURL(/\/tag\/Prompt$/)

  await page.getByRole('button', { name: '打开导航菜单' }).click()
  const tagSidebar = page.getByRole('complementary', { name: '论坛导航' })
  await tagSidebar.getByRole('button', { name: '标签' }).click()
  await expect(tagSidebar.getByRole('link', { name: /Prompt/ })).toHaveClass(/active/)
  await expect(tagSidebar.getByRole('link', { name: /Base64/ })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await tagSidebar.getByRole('button', { name: '关闭导航菜单' }).click()
  await page.getByRole('button', { name: '搜索' }).click()
  await expect(page).toHaveURL(/\/search$/)
  await expect(page.getByRole('searchbox', { name: '搜索主题和内容' })).toBeVisible()
})

test('owner can create a draft that stays out of the public topic stream', async ({ page }) => {
  const title = `端到端草稿 ${Date.now()}`
  await page.goto('/studio')
  await expect(page).toHaveURL(/\/studio\/sign-in$/)

  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await page.getByRole('link', { name: '＋ 新建帖子' }).click()
  await expect(page.getByText('创建新帖子', { exact: true })).toBeVisible()
  await expect(page.getByRole('toolbar', { name: 'Markdown 工具栏' })).toBeVisible()
  await page.getByRole('button', { name: '粗体' }).click()
  await expect(page.getByLabel('正文 · Markdown')).toHaveValue('**粗体文字**')
  await page.getByRole('textbox', { name: '标题', exact: true }).fill(title)
  await page.getByLabel('正文 · Markdown').fill('# 自动化验收\n\n这篇内容只能在管理工作台看到。')
  await page.getByRole('button', { name: '保存草稿' }).click()

  await expect(page).toHaveURL(/\/studio$/)
  await expect(page.getByText(title, { exact: true })).toBeVisible()

  await page.goto('/')
  await expect(page.getByText(title, { exact: true })).toHaveCount(0)
})
