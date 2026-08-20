export default defineNuxtRouteMiddleware(async () => {
  const requestFetch = useRequestFetch()
  try {
    const session = await requestFetch<{ authenticated: boolean }>('/api/auth/session')
    if (!session.authenticated) return navigateTo('/studio/sign-in')
  } catch {
    return navigateTo('/studio/sign-in')
  }
})
