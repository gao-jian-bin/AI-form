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

具体板块名称不是写在这里的，它们从数据库动态读取。请登录 `/studio/categories` 新增、改名、排序或删除板块。

顶部搜索不在这个文件中，而在 `SiteHeader.vue`。目前只删除了侧栏搜索，顶部搜索仍然保留。

## 3. 修改板块

日常管理不需要改源码。打开：

```text
http://localhost:3000/studio/categories
```

这里可以修改名称、说明、颜色和排序，也可以新增或删除空板块。板块的网址标识在创建后锁定，避免旧地址失效。

只有需要修改“全新空数据库的默认板块”时，才编辑：

```text
server/utils/database.ts
```

搜索 `ensureBaseCategories`。它只在数据库没有任何板块时创建 ChatGPT 和工具箱；不会覆盖后台做过的修改。

板块功能的源码分工如下：

```text
app/pages/studio/categories/       管理页面
app/components/CategoryEditor.vue  新建和编辑表单
server/api/studio/categories/      管理员 API
server/utils/validation.ts         输入格式校验
server/utils/database.ts           SQLite 读写和删除保护
```

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

Composer 中的标签选择器是另一套管理员组件：

```text
app/components/TagChooser.vue
server/api/studio/tags/index.get.ts
server/utils/database.ts → listStudioTags()
```

它会罗列已发布和草稿中出现过的全部标签，并允许搜索或创建新标签。最大标签数在 `TopicEditor.vue` 的 `:max="8"` 修改。

## 5. 修改 Composer 编辑器

Composer 是挂在全站根组件上的，不是单独跳转的编辑页面：

```text
app/app.vue                              挂载全局 Host
app/components/AdminComposerHost.vue    加载数据、关闭确认、路由离开保护
app/composables/useAdminComposer.ts      打开/收起/保存后的刷新状态
app/components/TopicEditor.vue           实际表单和 Markdown 编辑器
app/components/TagChooser.vue            标签选择器
```

要在新的按钮上打开帖子编辑器，使用：

```ts
const { openEdit, openNew } = useAdminComposer()

openEdit(topicId) // 编辑已有帖子
openNew()         // 创建帖子
```

公开帖子页的小铅笔入口在：

```text
app/pages/t/[slug]/[id].vue
```

`TopicEditor.vue` 控制：

- 标题、动态分类、标签和外部网站地址
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
right: max(18px, calc((100vw - 1240px) / 2));
left: max(18px, calc((100vw - 1240px) / 2));
height: min(66vh, 680px);
```

手机规则在同一文件的 `@media (max-width: 700px)` 中，当前高度上限是 `78dvh`。不要把 `position: fixed` 改掉，否则编辑器就不再停靠在浏览器底部。

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

## 11. 安全维护源码

开始修改前创建分支：

```powershell
git status
git switch -c feature/你的修改名称
```

修改过程中运行 `npm.cmd run dev` 看实时效果。检查通过后只提交自己修改的文件：

```powershell
git status
git add 具体文件路径
git commit -m "feat: 简短描述修改内容"
```

不要手动编辑 `node_modules`、`.nuxt`、`.output`，它们都会重新生成；也不要用文本编辑器打开 `.data/ai-forum.db`。数据库内容应通过后台或经过测试的数据库代码修改。
