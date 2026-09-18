export default defineNuxtConfig({
  compatibilityDate: '2026-08-20',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      titleTemplate: '%s',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#f5f7fa' },
        { name: 'description', content: '收录 ChatGPT 技巧、AI 学习框架与实用工具。' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/fused_logo_exact.svg' },
        { rel: 'alternate', type: 'application/atom+xml', title: '', href: '/feed.xml' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      siteName: '',
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
