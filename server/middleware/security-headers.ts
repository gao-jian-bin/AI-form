import { getRequestURL, setResponseHeaders } from 'h3'
import { securityHeaders } from '../utils/security'

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  const privateRoute = path === '/admin'
    || path.startsWith('/admin/')
    || path === '/studio'
    || path.startsWith('/studio/')
    || path.startsWith('/api/studio/')
    || path.startsWith('/api/auth/')

  setResponseHeaders(event, securityHeaders({
    production: process.env.NODE_ENV === 'production',
    privateRoute,
  }))
})
