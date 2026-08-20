export default defineNuxtConfig({
  compatibilityDate: '2026-08-20',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      titleTemplate: '%s · AI 知识轨道',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#f5f7fa' },
        { name: 'description', content: '收录 ChatGPT 技巧、AI 学习框架与实用工具。' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      siteName: 'AI 知识轨道',
      siteDescription: '把好用的 AI 方法和工具，整理成随时能找到的主题。',
    },
  },
  nitro: {
    externals: {
      external: ['better-sqlite3'],
    },
  },
  typescript: {
    typeCheck: true,
  },
})
