import { deleteCookie, getCookie } from 'h3'
import { revokeAdminSession } from '../../utils/auth'
import { getForumDatabase } from '../../utils/forum'
import { ADMIN_SESSION_COOKIE } from '../../utils/http'

export default defineEventHandler((event) => {
  revokeAdminSession(getForumDatabase(), getCookie(event, ADMIN_SESSION_COOKIE))
  deleteCookie(event, ADMIN_SESSION_COOKIE, { path: '/' })
  return { ok: true }
})
