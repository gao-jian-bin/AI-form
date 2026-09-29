import { expect, test, type Page } from '@playwright/test'

const pageErrors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  pageErrors.set(page, errors)
  page.on('pageerror', error => errors.push(error.message))
})
test.afterEach(async ({ page }) => { expect(pageErrors.get(page)).toEqual([]) })

async function login(page: Page) {
  const response = await page.request.post('/api/auth/login', { data: { password: 'ai-forum-local-admin' } })
  expect(response.ok()).toBe(true)
}

test('studio sign-in has a private layout and an accessible password toggle', async ({ page }) => {
  await page.goto('/admin/sign-in')
  await expect(page.getByRole('navigation', { name: '工作台导航' })).toHaveCount(0)
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '显示密码', exact: true }).click()
  await expect(page.getByLabel('管理员密码')).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: '隐藏密码', exact: true }).click()
  await expect(page.getByLabel('管理员密码')).toHaveAttribute('type', 'password')
  await page.screenshot({ path: 'output/playwright/studio-login.png', fullPage: true })
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/admin$/)
})

test('studio sidebar, command search and theme work without leaking styles to the public site', async ({ page }) => {
  await login(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/admin/overview')
  await expect(page.getByRole('heading', { name: '工作台概览', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '工作台概览', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.screenshot({ path: 'output/playwright/studio-overview.png', fullPage: true })
  await page.getByRole('button', { name: '切换侧边栏' }).click()
  await expect(page.locator('.studio-shell')).toHaveClass(/sidebar-collapsed/)
  await page.reload()
  await expect(page.locator('.studio-shell')).toHaveClass(/sidebar-collapsed/)
  await page.getByRole('button', { name: '切换侧边栏' }).click()
  await page.keyboard.press('Control+k')
  const command = page.getByRole('dialog', { name: '搜索后台' })
  await expect(command).toBeVisible()
  await command.getByRole('textbox', { name: '搜索页面或帖子' }).fill('标签')
  await command.getByRole('link', { name: /标签管理/ }).click()
  await expect(page).toHaveURL(/\/admin\/tags$/)
  await page.getByRole('button', { name: '切换到深色模式' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.screenshot({ path: 'output/playwright/studio-dark.png', fullPage: true })
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: '切换到浅色模式' }).click()
  await page.getByRole('button', { name: '搜索后台' }).click()
  await command.getByRole('textbox', { name: '搜索页面或帖子' }).fill('Squoosh')
  await command.getByRole('textbox', { name: '搜索页面或帖子' }).press('Enter')
  await expect(page.getByRole('searchbox', { name: '搜索标题' })).toHaveValue('Squoosh')
  await expect(page.locator('.topic-management-table tbody tr')).toHaveCount(1)
  await page.getByRole('searchbox', { name: '搜索标题' }).fill('')
  await page.screenshot({ path: 'output/playwright/studio-topics.png', fullPage: true })
  await page.locator('.admin-topbar').getByRole('link', { name: '查看网站' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('body')).not.toHaveAttribute('data-studio', 'true')
  await expect(page.locator('.d-header')).toBeVisible()
})

test('every studio management screen and form fits a narrow viewport', async ({ page }) => {
  await login(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin')
  const toggle = page.getByRole('button', { name: '切换侧边栏' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  const navigation = page.getByRole('dialog', { name: '内容工作台' })
  await expect(navigation).toBeVisible()
  await navigation.getByRole('link', { name: '板块管理', exact: true }).click()
  await expect(navigation).not.toBeVisible()
  await expect(page).toHaveURL(/\/admin\/categories$/)
  for (const [path, heading] of [
    ['/admin/overview', '工作台概览'], ['/admin', '帖子管理'],
    ['/admin/categories', '板块管理'], ['/admin/categories/new', '新建板块'],
    ['/admin/tags', '标签管理'], ['/admin/tags/new', '新建标签'],
    ['/admin/uploads', '图片管理'], ['/admin/analytics', '访问统计'],
  ]) {
    await page.goto(path!)
    await expect(page.getByRole('heading', { name: heading!, exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `output/playwright/studio-mobile-${path!.replaceAll('/', '-')}.png`, fullPage: true })
  }
  await toggle.click()
  await expect(navigation).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(navigation).not.toBeVisible()
  await expect(toggle).toBeFocused()
})

test('topic deletion errors preserve the list and failed refreshes offer retry', async ({ page }) => {
  await login(page)
  await page.goto('/admin')
  const firstTitle = await page.locator('.topic-management-table tbody tr').first().locator('td strong').first().innerText()
  await page.route('**/api/studio/topics/*', route => {
    if (route.request().method() === 'DELETE') return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ statusMessage: '测试：暂时无法删除' }) })
    return route.continue()
  })
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: '删除', exact: true }).first().click()
  await expect(page.getByRole('alert')).toContainText('测试：暂时无法删除')
  await expect(page.locator('.topic-management-table tbody tr').first()).toContainText(firstTitle!)
  await page.route('**/api/studio/topics', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ statusMessage: '测试：加载失败' }) }))
  await page.getByRole('button', { name: '刷新', exact: true }).click()
  await expect(page.getByRole('button', { name: '重新加载' })).toBeVisible()
  await page.unroute('**/api/studio/topics')
  await page.getByRole('button', { name: '重新加载' }).click()
  await expect(page.getByRole('button', { name: '重新加载' })).toHaveCount(0)
})

test('studio pagination and filtering can reach all topics', async ({ page }) => {
  await login(page)
  const created: number[] = []
  try {
    for (let index = 0; index < 22; index++) {
      const response = await page.request.post('/api/studio/topics', { data: {
        title: `分页回归-${index.toString().padStart(2, '0')}`, categorySlug: 'chatgpt',
        contentMarkdown: '分页测试内容', status: 'draft', tags: [],
      } })
      expect(response.ok()).toBe(true)
      created.push((await response.json()).id)
    }
    await page.goto('/admin?q=分页回归')
    await expect(page.locator('.topic-management-table tbody tr')).toHaveCount(20)
    await expect(page.getByRole('navigation', { name: '帖子管理分页' })).toContainText('共 22 条')
    await page.getByRole('button', { name: '下一页', exact: true }).click()
    await expect(page.locator('.topic-management-table tbody tr')).toHaveCount(2)
    await page.getByRole('searchbox', { name: '搜索标题' }).fill('分页回归-00')
    await expect(page.locator('.topic-management-table tbody tr')).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: '帖子管理分页' })).toContainText('第 1 / 1 页')
  } finally {
    for (const id of created) await page.request.delete(`/api/studio/topics/${id}`)
  }
})

test('canceling sign-out preserves the authenticated unsaved composer', async ({ page }) => {
  await login(page)
  await page.goto('/admin')
  await page.getByRole('button', { name: '新建帖子', exact: true }).click()
  const composer = page.getByRole('dialog', { name: '创建新帖子' })
  await composer.getByRole('textbox', { name: '标题', exact: true }).fill('不要丢失的草稿')
  await composer.getByRole('button', { name: '收起编辑器' }).click()
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  expect(await (await page.request.get('/api/auth/session')).json()).toMatchObject({ authenticated: true })
  await composer.getByRole('button', { name: '展开编辑器' }).click()
  await expect(composer.getByRole('textbox', { name: '标题', exact: true })).toHaveValue('不要丢失的草稿')
  await composer.getByRole('button', { name: '收起编辑器' }).click()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: '退出登录', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/sign-in$/)
  expect(await (await page.request.get('/api/auth/session')).json()).toMatchObject({ authenticated: false })
  await expect(page.getByRole('dialog', { name: '创建新帖子' })).toHaveCount(0)
})
