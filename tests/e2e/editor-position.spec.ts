import { expect, test } from '@playwright/test'

for (const width of [1280, 390]) {
  test(`formatting a selection in a long post preserves the editing position (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.request.post('/api/auth/login', { data: { password: 'ai-forum-local-admin' } })
    const title = `编辑位置回归 ${Date.now()}`
    const lines = Array.from({ length: 240 }, (_, index) => `第 ${index + 1} 行：const value = ${index};`)
    const content = lines.join('\n')
    const response = await page.request.post('/api/studio/topics', { data: {
      title, categorySlug: 'chatgpt', contentMarkdown: content, status: 'draft', tags: [],
    } })
    expect(response.ok()).toBe(true)
    const { id } = await response.json()
    try {
      await page.goto(`/admin?q=${encodeURIComponent(title)}`)
      await expect(page.getByRole('button', { name: '切换到深色模式', exact: true })).toBeEnabled({ timeout: 60_000 })
      await page.getByRole('button', { name: `编辑帖子：${title}`, exact: true }).click()
      const composer = page.getByRole('dialog', { name: '编辑帖子', exact: true })
      const editor = composer.getByLabel('正文 · Markdown')
      await expect(editor).toHaveValue(content)
      await expect(composer.locator('.d-editor-preview')).toContainText(lines[120]!)
      const url = page.url()
      let navigations = 0
      let saves = 0
      page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations += 1 })
      page.on('request', request => {
        if (['POST', 'PUT'].includes(request.method()) && /\/api\/studio\/topics(?:\/\d+)?$/.test(request.url())) saves += 1
      })

      for (const action of ['预格式化文本', '粗体', 'Ctrl+i']) {
        const before = await editor.evaluate((input) => {
          const start = input.value.indexOf('第 121 行')
          const end = input.value.indexOf('\n', input.value.indexOf('第 122 行'))
          input.focus({ preventScroll: true })
          input.setSelectionRange(start, end)
          input.scrollTop = 120 * parseFloat(getComputedStyle(input).lineHeight) - input.clientHeight / 2
          input.dispatchEvent(new Event('scroll'))
          return { scrollTop: input.scrollTop, selected: input.value.slice(start, end), pageY: window.scrollY }
        })
        expect(before.scrollTop).toBeGreaterThan(1000)
        if (action === 'Ctrl+i') await editor.press('Control+i')
        else await composer.getByRole('button', { name: action, exact: true }).click()
        await expect(editor).toBeFocused()
        await expect.poll(() => editor.evaluate(input => input.value.slice(input.selectionStart, input.selectionEnd)))
          .toBe(before.selected)
        const marker = action === '预格式化文本' ? '```\n' : action === '粗体' ? '**' : '*'
        expect(await editor.inputValue()).toContain(marker + before.selected)
        await expect.poll(() => editor.evaluate(input => input.scrollTop)).toBeCloseTo(before.scrollTop, 0)
        await expect(composer.locator('.d-editor-preview')).toContainText('第 121 行')
        // Check again after the debounced preview response and a browser paint.
        await page.waitForTimeout(350)
        expect(await editor.evaluate(input => input.scrollTop)).toBeCloseTo(before.scrollTop, 0)
        expect(await page.evaluate(() => window.scrollY)).toBe(before.pageY)
        expect(page.url()).toBe(url)
      }
      expect(navigations).toBe(0)
      expect(saves).toBe(0)
      expect(errors).toEqual([])
      if (process.env.EDITOR_QA_SCREENSHOT) {
        await page.screenshot({ path: process.env.EDITOR_QA_SCREENSHOT.replace('.png', `-${width}.png`) })
      }
    } finally {
      await page.request.delete(`/api/studio/topics/${id}`)
    }
  })
}
