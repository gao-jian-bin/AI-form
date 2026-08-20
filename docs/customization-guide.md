# 自定义修改指南

这份指南只列站点最常改的位置。修改后运行 `npm.cmd run dev`，浏览器会自动热更新。

## 1. 修改站点名称

顶部显示名称：

```text
app/components/SiteHeader.vue
```

搜索 `AI 知识论坛` 修改链接文字。

浏览器标题与默认描述：

```text
nuxt.config.ts
```

修改 `titleTemplate`、`siteName` 和 `siteDescription`。

## 2. 修改左侧导航文字

文件：

```text
app/components/ForumSidebar.vue
```

这里控制：

- `帖子`
- `最新帖子`
- `分类`
- ChatGPT、工具箱的导航结构

顶部搜索不在这个文件中，而在 `SiteHeader.vue`。目前只删除了侧栏搜索，顶部搜索仍然保留。

## 3. 修改分类名称、颜色和说明

文件：

```text
server/utils/database.ts
```

搜索 `ensureBaseCategories`。下面两行分别创建 ChatGPT 和工具箱分类：

```ts
insert.run('ChatGPT', 'chatgpt', '分类说明', '#0f9f7f', 1, timestamp, timestamp)
insert.run('工具箱', 'toolbox', '分类说明', '#d97706', 2, timestamp, timestamp)
```

参数顺序是：显示名称、URL slug、说明、颜色、排序。

## 4. 修改标签导航

标签折叠组件：

```text
app/components/SidebarTagSection.vue
```

默认状态由这一行控制：

```ts
const expanded = ref(false)
```

改成 `ref(true)` 后，标签默认展开。

标签数据来自：

```text
GET /api/tags
server/api/tags.get.ts
server/utils/database.ts → listPublicTags()
```

它读取所有已发布帖子的标签，因此进入单个标签页后，其他标签仍然存在。当前标签的高亮由 `activeTag` 控制。

## 5. 修改 Composer 编辑器

编辑器结构：

```text
app/components/TopicEditor.vue
```

这里控制：

- 标题、分类、标签和工具链接
- “更多设置”中的 Slug、摘要和置顶
- Markdown 输入框和实时预览
- 草稿与发布按钮
- 手机端编辑/预览切换

编辑器样式：

```text
app/assets/css/main.css
```

搜索注释：

```css
/* Discourse-style composer */
```

下面的 `.discourse-composer` 控制宽度和高度：

```css
width: min(1160px, calc(100% - 36px));
height: min(720px, calc(100dvh - 86px));
```

## 6. 修改 Markdown 工具栏

文件：

```text
app/utils/markdown-editor.ts
```

`COMPOSER_TOOLS` 数组决定按钮顺序、文字、提示和快捷键：

```ts
export const COMPOSER_TOOLS = [
  { id: 'bold', label: '粗体', text: 'B', shortcut: 'Ctrl+B' },
  { id: 'italic', label: '斜体', text: 'I', shortcut: 'Ctrl+I' },
]
```

删除数组中的一项会隐藏按钮；调整顺序会改变工具栏顺序。

`applyMarkdownAction()` 中的 `switch` 决定按钮怎样修改 Markdown。比如粗体使用：

```ts
return wrapSelection(value, start, end, '**', '**', '粗体文字')
```

目前支持：粗体、斜体、链接、引用、代码、无序列表、有序列表和二级标题。

## 7. 修改实时预览

编辑器每次输入后等待 220ms，再调用：

```text
POST /api/studio/preview
```

相关文件：

```text
server/api/studio/preview.post.ts
server/utils/content.ts
```

`renderSafeMarkdown()` 负责 Markdown 渲染和 HTML 安全过滤。不要为了支持自定义 HTML 而直接关闭过滤。

## 8. 修改帖子列表样式

帖子行结构：

```text
app/components/TopicRow.vue
```

列表和筛选栏：

```text
app/components/ForumPage.vue
```

样式在 `app/assets/css/main.css` 中搜索：

```css
/* Topic list based on official table hierarchy */
```

## 9. 修改演示内容

文件：

```text
server/utils/seed.ts
```

它只在数据库没有帖子时写入演示内容。数据库已有内容时，修改这个文件不会覆盖现有帖子。

## 10. 修改后的检查命令

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e
```

如果只修改文案或颜色，至少执行类型检查和生产构建；如果修改编辑器、标签或权限逻辑，应执行全部四条命令。
