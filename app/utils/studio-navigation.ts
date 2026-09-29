export const studioNavigation = [
  { label: '工作台概览', to: '/admin/overview', icon: 'overview', group: '工作空间', description: '内容总览与发布动态' },
  { label: '帖子管理', to: '/admin', icon: 'topics', group: '内容管理', description: '撰写、发布和整理帖子' },
  { label: '板块管理', to: '/admin/categories', icon: 'categories', group: '内容管理', description: '组织内容分类与展示顺序' },
  { label: '标签管理', to: '/admin/tags', icon: 'tags', group: '内容管理', description: '维护跨板块的内容标签' },
  { label: '图片管理', to: '/admin/uploads', icon: 'uploads', group: '资源与数据', description: '图片资源、存储空间与清理' },
  { label: '访问统计', to: '/admin/analytics', icon: 'analytics', group: '资源与数据', description: '浏览量与访客访问记录' },
] as const

export function isStudioRouteActive(path: string, target: string): boolean {
  if (target === '/admin') return path === '/admin' || path.startsWith('/admin/topics/')
  return path === target || path.startsWith(`${target}/`)
}
