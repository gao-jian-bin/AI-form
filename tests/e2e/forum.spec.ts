import { expect, test } from '@playwright/test'

test('category admin API rejects public requests', async ({ request }) => {
  const response = await request.get('/api/studio/categories')
  expect(response.status()).toBe(401)
})

test('studio tag API rejects public requests', async ({ request }) => {
  const response = await request.get('/api/studio/tags')
  expect(response.status()).toBe(401)

  const createResponse = await request.post('/api/studio/tags', { data: { name: '未授权标签' } })
  expect(createResponse.status()).toBe(401)
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

  await expect(page.getByRole('link', { name: 'AI 知识论坛', exact: true })).toBeVisible()
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
  await expect(page).toHaveURL(/\/tag\/prompt$/)

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
  const formattingToolbar = page.getByRole('toolbar', { name: 'Markdown 工具栏' })
  const markdownEditor = page.getByLabel('正文 · Markdown')
  await expect(formattingToolbar).toBeVisible()
  await expect(formattingToolbar.getByRole('button', { name: '删除线' })).toBeVisible()
  await expect(formattingToolbar.getByRole('button', { name: '任务列表' })).toBeVisible()
  await expect(formattingToolbar.getByRole('button', { name: '插入表格' })).toBeVisible()
  const [toolbarBox, editorBox] = await Promise.all([
    formattingToolbar.boundingBox(),
    markdownEditor.boundingBox(),
  ])
  expect(toolbarBox).not.toBeNull()
  expect(editorBox).not.toBeNull()
  expect(toolbarBox!.y + toolbarBox!.height).toBeLessThanOrEqual(editorBox!.y + 1)
  await page.getByRole('button', { name: '粗体' }).click()
  await expect(markdownEditor).toHaveValue('**粗体文字**')
  await page.getByRole('textbox', { name: '标题', exact: true }).fill(title)
  await markdownEditor.fill('# 自动化验收\n\n这篇内容只能在管理工作台看到。')
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

  await editor.fill('')
  await composer.getByRole('button', { name: '有序列表' }).click()
  await expect(editor).toHaveValue('1. 列表项')
  await editor.pressSequentially('第一项')
  await expect(editor).toHaveValue('1. 第一项')
  await editor.press('Enter')
  await expect(editor).toHaveValue('1. 第一项\n2. ')
  await editor.pressSequentially('第二项')
  await editor.press('Enter')
  await expect(editor).toHaveValue('1. 第一项\n2. 第二项\n3. ')
  await editor.press('Enter')
  await expect(editor).toHaveValue('1. 第一项\n2. 第二项\n')
  await expect(composer.locator('.d-editor-preview ol')).toContainText('第一项')

  const fencedCode = '```shell\n1. command\n```'
  const commandEnd = fencedCode.indexOf('\n```', 3)
  await editor.fill(fencedCode)
  await editor.evaluate((element, caret) => {
    element.focus()
    element.setSelectionRange(caret, caret)
  }, commandEnd)
  await editor.press('Enter')
  await expect(editor).toHaveValue('```shell\n1. command\n\n```')

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
  const editedTitle = await publishedRow.locator('td').first().locator('strong').innerText()
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
  const saved = await (await saveResponse).json() as { id: number, slug: string, publishedAt: string }
  expect(saved.publishedAt).toBe(new Date(localPublishTime).toISOString())

  await expect(composer).toBeHidden()
  const savedRow = page.getByRole('row').filter({ hasText: editedTitle })
  await expect(savedRow.getByText('2024.01.02 03:04', { exact: true })).toBeVisible()
  await expect(savedRow.getByText(/^修改 /)).toBeVisible()

  const sortSelect = page.getByLabel('排序方式')
  await expect(sortSelect).toBeVisible()
  await sortSelect.selectOption('published-asc')
  await expect(page.locator('.topic-management-table tbody tr').first()).toContainText(editedTitle)
  await sortSelect.selectOption('published-desc')
  await expect(page.locator('.topic-management-table tbody tr').first()).not.toContainText(editedTitle)

  await savedRow.getByRole('button', { name: /编辑帖子/ }).click()
  const reopenedComposer = page.getByRole('dialog', { name: '编辑帖子' })
  await reopenedComposer.getByText('更多设置').click()
  await expect(reopenedComposer.getByLabel('发布时间')).toHaveValue(localPublishTime)
  await reopenedComposer.getByRole('button', { name: '关闭编辑器' }).click()

  await page.goto(`/t/${saved.slug}/${saved.id}`)
  await expect(page.locator('.post-infos time')).toHaveText('2024.01.02')
  await page.goto(`/search?q=${encodeURIComponent(editedTitle)}`)
  await expect(page.locator(`[data-topic-id="${saved.id}"] td.activity time`)).toHaveText('2024.01.02')
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

test('owner can manage tags, select one, and the chooser closes after selection', async ({ page }) => {
  const originalName = `端到端标签 ${Date.now()}`
  const renamedTag = `${originalName} 已改`
  const topicTitle = `标签管理验收 ${Date.now()}`

  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)
  const missingUpdate = await page.request.put('/api/studio/tags/999999999', {
    data: { name: '不存在的标签' },
  })
  expect(missingUpdate.status()).toBe(404)
  await page.getByRole('link', { name: '标签管理' }).click()
  await page.getByRole('link', { name: '＋ 新建标签' }).click()
  await page.getByLabel('标签名称').fill(originalName)
  await page.getByRole('button', { name: '创建标签' }).click()

  let row = page.getByRole('row').filter({ hasText: originalName })
  await expect(row).toBeVisible()
  await expect(row).toContainText('0')
  await row.getByRole('link', { name: '编辑' }).click()
  await page.getByLabel('标签名称').fill(renamedTag)
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByRole('row').filter({ hasText: renamedTag })).toBeVisible()

  await page.getByRole('link', { name: '帖子管理' }).click()
  await page.getByRole('button', { name: '＋ 新建帖子' }).click()
  const composer = page.getByRole('dialog', { name: '创建新帖子' })
  await composer.getByRole('textbox', { name: '标题', exact: true }).fill(topicTitle)
  await composer.getByLabel('正文 · Markdown').fill('用于验收标签管理。')
  await composer.getByRole('button', { name: '选择标签' }).click()
  await composer.locator(`[data-tag-option="${renamedTag}"]`).click()
  await expect(composer.getByLabel('搜索或创建标签')).toHaveCount(0)
  await expect(composer.getByRole('button', { name: '选择标签' })).toBeFocused()
  await composer.getByRole('button', { name: '保存草稿' }).click()

  await page.getByRole('link', { name: '标签管理' }).click()
  row = page.getByRole('row').filter({ hasText: renamedTag })
  await expect(row).toContainText('1')
  page.once('dialog', dialog => dialog.accept())
  await row.getByRole('button', { name: '删除' }).click()
  await expect(page.getByRole('row').filter({ hasText: renamedTag })).toHaveCount(0)
})

test('public routes send security headers, real 404s, canonical redirects, sitemap and feed', async ({ request }) => {
  const health = await request.get('/api/health')
  expect(health.ok()).toBe(true)
  expect(await health.json()).toEqual({ ok: true })

  const home = await request.get('/')
  expect(home.headers()['x-content-type-options']).toBe('nosniff')
  expect(home.headers()['x-frame-options']).toBe('DENY')
  expect(home.headers()['content-security-policy']).toContain("frame-ancestors 'none'")

  expect((await request.get('/c/does-not-exist')).status()).toBe(404)
  expect((await request.get('/tag/does-not-exist')).status()).toBe(404)

  const pageResponse = await request.get('/api/topics?pageSize=1')
  const topicPage = await pageResponse.json() as {
    items: Array<{ id: number; slug: string }>
    total: number
  }
  expect(topicPage.total).toBeGreaterThan(0)
  const topic = topicPage.items[0]!
  const wrongSlug = await request.get(`/t/not-the-real-slug/${topic.id}`, { maxRedirects: 0 })
  expect(wrongSlug.status()).toBe(301)
  expect(wrongSlug.headers().location).toContain(`/t/${encodeURIComponent(topic.slug)}/${topic.id}`)

  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.headers()['content-type']).toContain('application/xml')
  expect(await sitemap.text()).toContain(`/t/${encodeURIComponent(topic.slug)}/${topic.id}`)
  const feed = await request.get('/feed.xml')
  expect(feed.headers()['content-type']).toContain('application/atom+xml')
  expect(await feed.text()).toContain('<feed xmlns="http://www.w3.org/2005/Atom">')
})

test('composer recovers a newer browser-local draft only after administrator approval', async ({ page }) => {
  const title = `本机恢复 ${Date.now()}`
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await page.getByRole('button', { name: '＋ 新建帖子' }).click()
  let composer = page.getByRole('dialog', { name: '创建新帖子' })
  await composer.getByRole('textbox', { name: '标题', exact: true }).fill(title)
  await composer.getByLabel('正文 · Markdown').fill('这段内容只在浏览器本机暂存。')
  await expect(composer.getByText(/已在本机暂存/)).toBeVisible()

  page.once('dialog', dialog => dialog.accept())
  await composer.getByRole('button', { name: '关闭编辑器' }).click()
  await page.getByRole('button', { name: '＋ 新建帖子' }).click()
  composer = page.getByRole('dialog', { name: '创建新帖子' })
  await expect(composer.getByText('发现未保存的本机草稿')).toBeVisible()
  await composer.getByRole('button', { name: '恢复', exact: true }).click()
  await expect(composer.getByRole('textbox', { name: '标题', exact: true })).toHaveValue(title)
  await expect(composer.getByLabel('正文 · Markdown')).toHaveValue('这段内容只在浏览器本机暂存。')
})

test('administrator can inspect and restore a saved topic revision', async ({ page }) => {
  const suffix = Date.now()
  const firstTitle = `历史版本一 ${suffix}`
  const secondTitle = `历史版本二 ${suffix}`
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)

  const createdResponse = await page.request.post('/api/studio/topics', {
    data: {
      title: firstTitle,
      categorySlug: 'chatgpt',
      contentMarkdown: '第一版正文',
      tags: ['版本测试'],
      status: 'published',
      isPinned: false,
      externalUrl: null,
    },
  })
  expect(createdResponse.ok()).toBe(true)
  const created = await createdResponse.json() as { id: number }
  const updatedResponse = await page.request.put(`/api/studio/topics/${created.id}`, {
    data: {
      title: secondTitle,
      categorySlug: 'toolbox',
      contentMarkdown: '第二版正文',
      tags: ['版本测试', '第二版'],
      status: 'published',
      isPinned: true,
      externalUrl: null,
    },
  })
  expect(updatedResponse.ok()).toBe(true)
  await page.reload()

  const row = page.getByRole('row').filter({ hasText: secondTitle })
  await row.getByRole('button', { name: /编辑帖子/ }).click()
  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  const unsavedContent = `恢复历史前尚未保存 ${suffix}`
  await composer.getByLabel('正文 · Markdown').fill(unsavedContent)
  await expect(composer.getByText(/已在本机暂存/)).toBeVisible()
  await composer.getByRole('button', { name: '历史版本' }).click()
  const history = composer.getByLabel('帖子历史版本')
  await expect(history.getByText(firstTitle, { exact: true })).toBeVisible()
  page.once('dialog', dialog => dialog.accept())
  await history.getByRole('button', { name: '恢复此版本' }).click()
  await expect(composer).toBeHidden()

  const restored = await (await page.request.get(`/api/studio/topics/${created.id}`)).json() as {
    title: string
    contentMarkdown: string
  }
  expect(restored).toMatchObject({ title: firstTitle, contentMarkdown: '第一版正文' })

  const restoredRow = page.getByRole('row').filter({ hasText: firstTitle })
  await restoredRow.getByRole('button', { name: /编辑帖子/ }).click()
  const reopenedComposer = page.getByRole('dialog', { name: '编辑帖子' })
  await expect(reopenedComposer.getByText('发现未保存的本机草稿')).toBeVisible()
  await reopenedComposer.getByRole('button', { name: '恢复', exact: true }).click()
  await expect(reopenedComposer.getByLabel('正文 · Markdown')).toHaveValue(unsavedContent)
})

test('image management deletes an unreferenced upload from the studio', async ({ page }) => {
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)
  const imageBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  )
  const upload = await page.request.post('/api/studio/uploads', {
    multipart: { file: { name: '待清理.png', mimeType: 'image/png', buffer: imageBytes } },
  })
  expect(upload.status()).toBe(201)
  const stored = await upload.json() as { url: string }
  const uploadPath = stored.url.replace('/uploads/', '')

  await page.goto('/studio/uploads')
  const card = page.locator('.media-card').filter({ hasText: uploadPath })
  await expect(card).toBeVisible()
  await expect(card).toContainText('未使用，可清理')
  page.once('dialog', dialog => dialog.accept())
  await card.getByRole('button', { name: '删除' }).click()
  await expect(page.locator('.media-card').filter({ hasText: uploadPath })).toHaveCount(0)
  expect((await page.request.get(stored.url)).status()).toBe(404)
})

test('public topic navigation reaches posts beyond the first page', async ({ page }) => {
  const tagName = `pagination-${Date.now()}`
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)
  for (let index = 1; index <= 31; index += 1) {
    const response = await page.request.post('/api/studio/topics', {
      data: {
        title: `分页验收 ${tagName} ${index}`,
        categorySlug: 'chatgpt',
        contentMarkdown: `分页正文 ${index}`,
        tags: [tagName],
        status: 'published',
        isPinned: false,
        externalUrl: null,
      },
    })
    expect(response.ok()).toBe(true)
  }

  await page.goto(`/tag/${tagName}`)
  await expect(page.locator('.topic-list-body > tr')).toHaveCount(30)
  await expect(page.getByRole('navigation', { name: '帖子分页' })).toContainText('共 31 篇')
  await page.getByRole('link', { name: '下一页' }).click()
  await expect(page).toHaveURL(/\?page=2$/)
  await expect(page.locator('.topic-list-body > tr')).toHaveCount(1)
})
