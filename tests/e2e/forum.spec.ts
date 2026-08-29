import { expect, test } from '@playwright/test'

test('category admin API rejects public requests', async ({ request }) => {
  const response = await request.get('/api/studio/categories')
  expect(response.status()).toBe(401)
})

test('studio tag API rejects public requests', async ({ request }) => {
  const response = await request.get('/api/studio/tags')
  expect(response.status()).toBe(401)
})

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
  await page.getByRole('button', { name: '＋ 新建帖子' }).click()
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

test('studio topic actions remain inside the desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)

  const tableWrap = page.locator('.studio-table-wrap')
  const firstEditLink = page.getByRole('button', { name: /编辑帖子/ }).first()
  await expect(firstEditLink).toBeVisible()

  const [wrapBox, editBox] = await Promise.all([
    tableWrap.boundingBox(),
    firstEditLink.boundingBox(),
  ])

  expect(wrapBox).not.toBeNull()
  expect(editBox).not.toBeNull()
  expect(editBox!.x + editBox!.width).toBeLessThanOrEqual(wrapBox!.x + wrapBox!.width)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('studio topic actions remain visible on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)

  const tableWrap = page.locator('.studio-table-wrap')
  const firstEditLink = page.getByRole('button', { name: /编辑帖子/ }).first()
  const firstDeleteButton = page.getByRole('button', { name: '删除' }).first()
  const [wrapBox, editBox, deleteBox] = await Promise.all([
    tableWrap.boundingBox(),
    firstEditLink.boundingBox(),
    firstDeleteButton.boundingBox(),
  ])

  expect(wrapBox).not.toBeNull()
  expect(editBox).not.toBeNull()
  expect(deleteBox).not.toBeNull()
  expect(editBox!.x).toBeGreaterThanOrEqual(wrapBox!.x)
  expect(editBox!.x + editBox!.width).toBeLessThanOrEqual(wrapBox!.x + wrapBox!.width)
  expect(deleteBox!.x + deleteBox!.width).toBeLessThanOrEqual(wrapBox!.x + wrapBox!.width)
})

test('studio edit opens a docked composer without leaving the topic list', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)
  const urlBefore = page.url()

  const publishedRow = page.getByRole('row').filter({ has: page.locator('.status-published') }).first()
  await publishedRow.getByRole('button', { name: /编辑帖子/ }).click()

  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  await expect(composer).toBeVisible()
  await expect(page).toHaveURL(urlBefore)
  await expect(composer.getByRole('textbox', { name: '标题', exact: true })).toHaveValue(/.+/)
  await composer.getByRole('button', { name: '选择标签' }).click()
  await expect(composer.locator('[data-tag-option="Base64"]')).toBeVisible()
  await expect(composer.getByRole('toolbar', { name: 'Markdown 工具栏' })).toBeVisible()
  await expect(composer.getByRole('button', { name: '保存修改' })).toBeVisible()
  await composer.getByRole('button', { name: '收起编辑器' }).click()
  await expect(composer.getByRole('textbox', { name: '标题', exact: true })).toBeHidden()
  await composer.getByRole('button', { name: '展开编辑器' }).click()
  await expect(composer.getByRole('textbox', { name: '标题', exact: true })).toBeVisible()
  const [composerBox, editorBox, previewBox] = await Promise.all([
    page.locator('#reply-control').boundingBox(),
    composer.locator('.d-editor-textarea-column').boundingBox(),
    composer.locator('.d-editor-preview-wrapper').boundingBox(),
  ])
  expect(composerBox).not.toBeNull()
  expect(editorBox).not.toBeNull()
  expect(previewBox).not.toBeNull()
  expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(900)
  expect(composerBox!.height).toBeLessThanOrEqual(Math.ceil(900 * 0.66))
  expect(editorBox!.x + editorBox!.width).toBeLessThanOrEqual(previewBox!.x + 1)
  await expect(page.locator('.composer-page-backdrop')).toHaveCount(0)
})

test('owner can manage categories and use them in the topic editor', async ({ page }) => {
  const suffix = Date.now()
  const categorySlug = `ai-image-${suffix}`
  const emptySlug = `empty-${suffix}`
  const categoryName = `AI 绘画 ${suffix}`
  const updatedCategoryName = `AI 图像 ${suffix}`
  const draftTitle = `AI 图像草稿 ${suffix}`

  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)

  await page.getByRole('link', { name: '板块管理' }).click()
  await page.getByRole('link', { name: '＋ 新建板块' }).click()
  await page.getByLabel('板块名称').fill(categoryName)
  await page.getByLabel('网址标识').fill(categorySlug)
  await page.getByLabel('板块说明').fill('图像生成与处理资源')
  await page.getByLabel('板块颜色').fill('#7c3aed')
  await page.getByLabel('显示顺序').fill('3')
  await page.getByRole('button', { name: '创建板块' }).click()
  await expect(page).toHaveURL(/\/studio\/categories$/)
  await expect(page.getByText(categoryName, { exact: true })).toBeVisible()

  await page.getByRole('link', { name: '帖子管理' }).click()
  await page.getByRole('button', { name: '＋ 新建帖子' }).click()
  await page.getByRole('textbox', { name: '标题', exact: true }).fill(draftTitle)
  await page.getByLabel('分类').selectOption(categorySlug)
  await page.getByLabel('外部网站地址').fill('https://example.com/ai-image')
  await page.getByLabel('正文 · Markdown').fill('这是一篇放在动态板块中的草稿。')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page).toHaveURL(/\/studio$/)

  await page.getByRole('link', { name: '板块管理' }).click()
  const categoryRow = page.getByRole('row').filter({ hasText: categorySlug })
  await categoryRow.getByRole('link', { name: '编辑' }).click()
  await expect(page.getByLabel('网址标识')).toHaveAttribute('readonly', '')
  await page.getByLabel('板块名称').fill(updatedCategoryName)
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByText(updatedCategoryName, { exact: true })).toBeVisible()

  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('row').filter({ hasText: categorySlug }).getByRole('button', { name: '删除' }).click()
  await expect(page.getByRole('alert')).toContainText('板块中还有帖子，请先移动或删除这些帖子')

  await page.getByRole('link', { name: '＋ 新建板块' }).click()
  await page.getByLabel('板块名称').fill('临时空板块')
  await page.getByLabel('网址标识').fill(emptySlug)
  await page.getByLabel('板块颜色').fill('#64748b')
  await page.getByLabel('显示顺序').fill('99')
  await page.getByRole('button', { name: '创建板块' }).click()
  const emptyRow = page.getByRole('row').filter({ hasText: emptySlug })
  await emptyRow.getByRole('button', { name: '删除' }).click()
  await expect(page.getByText(emptySlug, { exact: true })).toHaveCount(0)
})
