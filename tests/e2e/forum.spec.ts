import { expect, test } from '@playwright/test'

test('category admin API rejects public requests', async ({ request }) => {
  const response = await request.get('/api/studio/categories')
  expect(response.status()).toBe(401)
})

test('studio tag API rejects public requests', async ({ request }) => {
  const response = await request.get('/api/studio/tags')
  expect(response.status()).toBe(401)
})

test('image upload API is private and serves uploaded image bytes publicly', async ({ request }) => {
  const publicResponse = await request.post('/api/studio/uploads', {
    multipart: {
      file: {
        name: 'public.png',
        mimeType: 'image/png',
        buffer: Buffer.from('not allowed'),
      },
    },
  })
  expect(publicResponse.status()).toBe(401)

  const login = await request.post('/api/auth/login', {
    data: { password: 'ai-forum-local-admin' },
  })
  expect(login.ok()).toBe(true)

  const imageBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  )
  const upload = await request.post('/api/studio/uploads', {
    multipart: {
      file: {
        name: '粘贴的截图.png',
        mimeType: 'image/png',
        buffer: imageBytes,
      },
    },
  })
  expect(upload.status()).toBe(201)
  const result = await upload.json() as {
    url: string
    alt: string
    mimeType: string
    size: number
  }
  expect(result.url).toMatch(/^\/uploads\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/)
  expect(result).toMatchObject({
    alt: '粘贴的截图',
    mimeType: 'image/png',
    size: imageBytes.length,
  })

  const storedImage = await request.get(result.url)
  expect(storedImage.ok()).toBe(true)
  expect(storedImage.headers()['content-type']).toContain('image/png')
  expect(await storedImage.body()).toEqual(imageBytes)
})

test('image upload API rejects files whose bytes are not an allowed image', async ({ request }) => {
  await request.post('/api/auth/login', {
    data: { password: 'ai-forum-local-admin' },
  })

  const response = await request.post('/api/studio/uploads', {
    multipart: {
      file: {
        name: '伪装图片.png',
        mimeType: 'image/png',
        buffer: Buffer.from('<svg><script>alert(1)</script></svg>'),
      },
    },
  })
  expect(response.status()).toBe(415)
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

test('composer renders quotes and keeps long editor panes independently scrollable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  const publishedRow = page.getByRole('row').filter({ has: page.locator('.status-published') }).first()
  await publishedRow.getByRole('button', { name: /编辑帖子/ }).click()

  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  const editor = composer.getByLabel('正文 · Markdown')
  await editor.fill('正文')
  await editor.press('End')
  await composer.getByRole('button', { name: '引用' }).click()
  await expect(editor).toHaveValue('正文\n\n> 引用内容')
  await expect(composer.locator('.d-editor-preview blockquote')).toContainText('引用内容')

  const longText = Array.from({ length: 220 }, (_, index) => `第 ${index + 1} 行滚动内容`).join('\n\n')
  await editor.fill(longText)
  await expect.poll(() => editor.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
  await expect.poll(() => composer.locator('.d-editor-preview-wrapper').evaluate(
    element => element.scrollHeight > element.clientHeight,
  )).toBe(true)
  await expect(editor).toHaveCSS('overflow-y', 'scroll')
  await expect(editor).toHaveCSS('scrollbar-gutter', 'stable')
})

test('composer uploads pasted images and inserts their Markdown into the post', async ({ page }) => {
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  const publishedRow = page.getByRole('row').filter({ has: page.locator('.status-published') }).first()
  await publishedRow.getByRole('button', { name: /编辑帖子/ }).click()

  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  const editor = composer.getByLabel('正文 · Markdown')
  const saveButton = composer.getByRole('button', { name: '保存修改' })
  await expect(composer.getByRole('button', { name: '上传图片' })).toBeVisible()

  await page.route('**/api/studio/uploads', async (route) => {
    await new Promise(resolveDelay => setTimeout(resolveDelay, 300))
    await route.continue()
  })

  await editor.focus()
  await editor.press('Control+End')
  await editor.evaluate((element, base64) => {
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))
    const clipboard = new DataTransfer()
    clipboard.items.add(new File([bytes], '粘贴截图.png', { type: 'image/png' }))
    element.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: clipboard,
    }))
  }, 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')

  await expect(composer.getByText('正在上传 1 张图片…')).toBeVisible()
  await expect(saveButton).toBeDisabled()
  await expect(editor).toHaveValue(/!\[粘贴截图\]\(\/uploads\/\d{4}\/\d{2}\/[0-9a-f-]+\.png\)/)
  await expect(composer.locator('.d-editor-preview img')).toHaveAttribute('src', /\/uploads\//)
  await expect(composer.getByText('图片已插入正文')).toBeVisible()
  await expect(saveButton).toBeEnabled()
})

test('composer fills the webpage viewport and exits fullscreen with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await page.getByRole('button', { name: /编辑帖子/ }).first().click()

  const root = page.locator('#reply-control')
  await page.getByRole('button', { name: '全屏编辑' }).click()
  await expect(root).toHaveClass(/fullscreen/)
  await expect(page.locator('html')).toHaveClass(/composer-fullscreen/)
  const box = await root.boundingBox()
  expect(box).toMatchObject({ x: 0, y: 0, width: 1280, height: 900 })
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')

  await page.keyboard.press('Escape')
  await expect(root).not.toHaveClass(/fullscreen/)
  await expect(page.locator('html')).not.toHaveClass(/composer-fullscreen/)
})

test('composer grippie resizes the docked editor within viewport bounds', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await page.getByRole('button', { name: /编辑帖子/ }).first().click()

  const root = page.locator('#reply-control')
  const grippie = page.getByRole('separator', { name: '调整编辑器高度' })
  const before = await root.boundingBox()
  const handle = await grippie.boundingBox()
  expect(before).not.toBeNull()
  expect(handle).not.toBeNull()

  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2)
  await page.mouse.down()
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y - 120)
  await page.mouse.up()
  const afterPointer = await root.boundingBox()
  expect(afterPointer!.height).toBeGreaterThan(before!.height + 80)

  await grippie.focus()
  await grippie.press('ArrowDown')
  const afterKeyboard = await root.boundingBox()
  expect(afterKeyboard!.height).toBeLessThan(afterPointer!.height)
})

test('mobile composer keeps editing, preview and save controls usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)

  const publishedRow = page.getByRole('row').filter({ has: page.locator('.status-published') }).first()
  await publishedRow.getByRole('button', { name: /编辑帖子/ }).click()
  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  await expect(composer).toBeVisible()
  await expect(composer.getByRole('tab', { name: '编辑' })).toHaveAttribute('aria-selected', 'true')
  await expect(composer.getByRole('button', { name: '保存修改' })).toBeVisible()

  await composer.getByRole('tab', { name: '预览' }).click()
  await expect(composer.getByRole('tab', { name: '预览' })).toHaveAttribute('aria-selected', 'true')
  await expect(composer.locator('.d-editor-preview-wrapper')).toBeVisible()
  await composer.getByRole('tab', { name: '编辑' }).click()
  await expect(composer.getByLabel('正文 · Markdown')).toBeVisible()

  const composerBox = await page.locator('#reply-control').boundingBox()
  expect(composerBox).not.toBeNull()
  expect(composerBox!.height).toBeLessThanOrEqual(Math.ceil(844 * 0.78))
  expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(844)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await composer.getByRole('button', { name: '全屏编辑' }).click()
  const fullscreenBox = await page.locator('#reply-control').boundingBox()
  expect(fullscreenBox).not.toBeNull()
  expect(fullscreenBox!.x).toBe(0)
  expect(fullscreenBox!.y).toBe(0)
  expect(fullscreenBox!.width).toBe(390)
  expect(fullscreenBox!.height).toBe(844)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await composer.getByRole('button', { name: '退出全屏' }).click()
  await expect(page.locator('#reply-control')).not.toHaveClass(/fullscreen/)
})

test('administrator edits a public topic from its Discourse pencil action', async ({ page }) => {
  await page.goto('/studio/sign-in')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)
  await page.goto('/')
  await page.getByRole('link', { name: 'Squoosh：在浏览器里压缩图片' }).click()
  await expect(page).toHaveURL(/\/t\//)
  const topicUrl = page.url()

  await page.getByRole('button', { name: '编辑帖子' }).click()

  await expect(page.getByRole('dialog', { name: '编辑帖子' })).toBeVisible()
  await expect(page).toHaveURL(topicUrl)
})

test('public visitors never see the topic edit pencil', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Squoosh：在浏览器里压缩图片' }).click()
  await expect(page.getByRole('button', { name: '编辑帖子' })).toHaveCount(0)
})

test('legacy compatible composer routes open the global composer', async ({ page }) => {
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)

  await page.goto('/studio/topics/1/edit')
  await expect(page).toHaveURL(/\/studio$/)
  await expect(page.getByRole('dialog', { name: '编辑帖子' })).toBeVisible()
  await page.getByRole('button', { name: '关闭编辑器' }).click()

  await page.goto('/studio/topics/new')
  await expect(page).toHaveURL(/\/studio$/)
  await expect(page.getByRole('dialog', { name: '创建新帖子' })).toBeVisible()
})

test('saving the composer refreshes the background topic without navigation', async ({ page }) => {
  const title = `Composer 刷新 ${Date.now()}`
  const updatedTitle = `${title}（已更新）`
  await page.goto('/studio/sign-in')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)

  const response = await page.request.post('/api/studio/topics', {
    data: {
      title,
      categorySlug: 'chatgpt',
      contentMarkdown: '用于验证 Composer 保存后的背景刷新。',
      tags: ['Prompt'],
      status: 'published',
      isPinned: false,
      externalUrl: null,
    },
  })
  expect(response.ok()).toBe(true)
  const created = await response.json() as { id: number; category: { slug: string } }
  await page.goto(`/t/${created.category.slug}/${created.id}`)
  const topicUrl = page.url()

  await page.getByRole('button', { name: '编辑帖子' }).click()
  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  await composer.getByRole('textbox', { name: '标题', exact: true }).fill(updatedTitle)
  await composer.getByRole('button', { name: '保存修改' }).click()

  await expect(composer).toBeHidden()
  await expect(page).toHaveURL(topicUrl)
  await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible()
})

test('administrator can override a topic publish time in the composer', async ({ page }) => {
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)

  const publishedRow = page.getByRole('row').filter({ has: page.locator('.status-published') }).first()
  await publishedRow.getByRole('button', { name: /编辑帖子/ }).click()
  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  await composer.getByText('更多设置').click()
  const publishTime = composer.getByLabel('发布时间')
  await expect(publishTime).toHaveValue(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)

  const localPublishTime = '2024-01-02T03:04'
  await publishTime.fill(localPublishTime)
  const saveResponse = page.waitForResponse(response =>
    response.request().method() === 'PUT'
    && /\/api\/studio\/topics\/\d+$/.test(new URL(response.url()).pathname),
  )
  await composer.getByRole('button', { name: '保存修改' }).click()
  const saved = await (await saveResponse).json() as { publishedAt: string }
  expect(saved.publishedAt).toBe(new Date(localPublishTime).toISOString())

  await expect(composer).toBeHidden()
  await publishedRow.getByRole('button', { name: /编辑帖子/ }).click()
  const reopenedComposer = page.getByRole('dialog', { name: '编辑帖子' })
  await reopenedComposer.getByText('更多设置').click()
  await expect(reopenedComposer.getByLabel('发布时间')).toHaveValue(localPublishTime)
})

test('unsaved composer changes require confirmation before closing', async ({ page }) => {
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)

  await page.getByRole('button', { name: /编辑帖子/ }).first().click()
  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  const titleInput = composer.getByRole('textbox', { name: '标题', exact: true })
  await expect(titleInput).toBeVisible()
  const originalTitle = await titleInput.inputValue()
  await titleInput.fill(`${originalTitle} - 尚未保存`)

  page.once('dialog', dialog => dialog.dismiss())
  await composer.getByRole('button', { name: '关闭编辑器' }).click()
  await expect(composer).toBeVisible()
  await expect(titleInput).toHaveValue(`${originalTitle} - 尚未保存`)

  page.once('dialog', dialog => dialog.accept())
  await composer.getByRole('button', { name: '关闭编辑器' }).click()
  await expect(composer).toBeHidden()
})

test('failed composer save keeps the editor and entered content', async ({ page }) => {
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)

  await page.getByRole('button', { name: /编辑帖子/ }).first().click()
  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  const titleInput = composer.getByRole('textbox', { name: '标题', exact: true })
  const changedTitle = `保存失败仍保留 ${Date.now()}`
  await titleInput.fill(changedTitle)
  await page.route('**/api/studio/topics/*', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusMessage: '故意制造的保存失败' }),
      })
      return
    }
    await route.continue()
  })

  await composer.getByRole('button', { name: /保存修改|发布帖子/ }).click()

  await expect(composer.getByRole('alert')).toContainText('故意制造的保存失败')
  await expect(composer).toBeVisible()
  await expect(titleInput).toHaveValue(changedTitle)
})

test('unsaved composer changes require confirmation before route navigation', async ({ page }) => {
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)

  await page.getByRole('button', { name: /编辑帖子/ }).first().click()
  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  const titleInput = composer.getByRole('textbox', { name: '标题', exact: true })
  await titleInput.fill(`${await titleInput.inputValue()} - 尚未保存`)

  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('link', { name: /查看网站/ }).click()
  await expect(page).toHaveURL(/\/studio$/)
  await expect(composer).toBeVisible()

  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('link', { name: /查看网站/ }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(composer).toBeHidden()
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
