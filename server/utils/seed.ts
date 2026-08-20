import type Database from 'better-sqlite3'
import { ensureBaseCategories, saveTopic, type TopicInput } from './database'

const DEMO_TOPICS: TopicInput[] = [
  {
    title: '欢迎来到 AI 知识论坛',
    categorySlug: 'chatgpt',
    contentMarkdown: `这里收录能真正派上用场的 ChatGPT 技巧、提示词和 AI 工作流。

## 从这里开始

- 在首页按板块浏览主题
- 使用右上角搜索标题和正文
- 点击标签发现同类内容

内容会持续更新，但不会为了数量堆砌重复信息。`,
    status: 'published',
    tags: ['站点指南'],
    isPinned: true,
    externalUrl: null,
  },
  {
    title: '让 ChatGPT 先复述任务，再开始回答',
    categorySlug: 'chatgpt',
    contentMarkdown: `复杂任务最容易出错的地方，往往不是模型不会做，而是双方对目标理解不同。

可以在提示词结尾加入：

> 开始前，请先用三句话复述你的理解、列出关键约束；如果信息足够，再继续完成任务。

这会把隐含分歧提前暴露出来，特别适合写作、代码修改和长流程研究。`,
    status: 'published',
    tags: ['Prompt', '工作流'],
    isPinned: false,
    externalUrl: null,
  },
  {
    title: '把一次好回答沉淀成可复用模板',
    categorySlug: 'chatgpt',
    contentMarkdown: `当一次对话结果很好时，不要只收藏答案。让 ChatGPT 反向整理这次成功所需的输入：

1. 目标与受众
2. 必要上下文
3. 输出格式
4. 质量检查清单

最后把它保存为 Markdown 模板，下次只替换变量。`,
    status: 'published',
    tags: ['Prompt', '效率'],
    isPinned: false,
    externalUrl: null,
  },
  {
    title: '草稿：我的 AI 学习框架',
    categorySlug: 'chatgpt',
    contentMarkdown: '这是一篇只有站长能看到的演示草稿，用于验证发布工作流。',
    status: 'draft',
    tags: ['学习方法'],
    isPinned: false,
    externalUrl: null,
  },
  {
    title: 'Squoosh：在浏览器里压缩图片',
    categorySlug: 'toolbox',
    contentMarkdown: `Squoosh 可以直观比较压缩前后的画质和体积，并支持 WebP、AVIF 等常见格式。

图片主要在浏览器本地处理，适合在发帖前压缩封面和截图。`,
    status: 'published',
    tags: ['图片处理', '压缩'],
    isPinned: true,
    externalUrl: 'https://squoosh.app/',
  },
  {
    title: 'CloudConvert：常见文件格式在线转换',
    categorySlug: 'toolbox',
    contentMarkdown: `CloudConvert 支持文档、图片、音视频、压缩包等多类格式。

上传敏感文件前，应先阅读服务的隐私和数据保留说明；机密资料优先使用本地工具。`,
    status: 'published',
    tags: ['格式转换'],
    isPinned: false,
    externalUrl: 'https://cloudconvert.com/',
  },
  {
    title: 'CyberChef：Base64 编解码与数据处理',
    categorySlug: 'toolbox',
    contentMarkdown: `CyberChef 像一张可组合的“数据处理菜谱”，除了 Base64，还可以处理 URL 编码、哈希、时间戳和文本格式。

将操作拖进 Recipe 区，再把内容放到 Input 区即可查看结果。`,
    status: 'published',
    tags: ['Base64', '开发工具'],
    isPinned: false,
    externalUrl: 'https://gchq.github.io/CyberChef/',
  },
  {
    title: 'Cobalt：简洁的媒体保存工具',
    categorySlug: 'toolbox',
    contentMarkdown: `Cobalt 提供简洁的媒体链接处理界面。

请只保存你自己创作、已获得授权或平台明确允许下载的内容，并遵守所在地法律及原平台条款。`,
    status: 'published',
    tags: ['视频工具', '开源工具'],
    isPinned: false,
    externalUrl: 'https://cobalt.tools/',
  },
]

export function seedDemoContent(db: Database.Database): number {
  ensureBaseCategories(db)
  const existing = db.prepare('SELECT COUNT(*) AS count FROM topics').get() as { count: number }
  if (existing.count > 0) return 0

  const transaction = db.transaction(() => {
    for (const topic of DEMO_TOPICS) saveTopic(db, topic)
  })
  transaction()
  return DEMO_TOPICS.length
}
