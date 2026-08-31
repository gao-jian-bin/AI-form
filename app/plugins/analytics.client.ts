export default defineNuxtPlugin((nuxtApp) => {
  let lastRecordedPath = ''

  nuxtApp.hook('page:finish', () => {
    const path = nuxtApp.$router.currentRoute.value.fullPath
    if (path === lastRecordedPath) return
    lastRecordedPath = path

    void $fetch('/api/analytics/view', {
      method: 'POST',
      body: { path },
    }).catch(() => {
      // Statistics must never interrupt normal browsing.
    })
  })
})
