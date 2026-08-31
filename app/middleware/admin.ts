export default defineNuxtRouteMiddleware(async () => {
  const requestFetch = useRequestFetch()
  try {
    const session = await requestFetch<{ authenticated: boolean }>('/api/auth/session')
    if (!session.authenticated) return navigateTo('/admin/sign-in')
  } catch {
    return navigateTo('/admin/sign-in')
  }
})
