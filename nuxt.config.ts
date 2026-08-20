export default defineNuxtConfig({
  compatibilityDate: '2026-08-20',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      titleTemplate: '%s · AI 知识论坛',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#f5f7fa' },
        { name: 'description', content: '收录 ChatGPT 技巧、AI 学习框架与实用工具。' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      siteName: 'AI 知识论坛',
      siteDescription: '以论坛主题的方式整理 ChatGPT 方法和实用工具。',
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
