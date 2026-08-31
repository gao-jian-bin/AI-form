import { getRequestURL, sendRedirect } from 'h3'

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (url.pathname !== '/studio' && !url.pathname.startsWith('/studio/')) return

  const adminPath = `/admin${url.pathname.slice('/studio'.length)}${url.search}`
  return sendRedirect(event, adminPath, 308)
})
