import { getCookie } from 'h3'
import { validateAdminSession } from '../../utils/auth'
import { getForumDatabase } from '../../utils/forum'
import { ADMIN_SESSION_COOKIE } from '../../utils/http'

export default defineEventHandler((event) => ({
  authenticated: validateAdminSession(getForumDatabase(), getCookie(event, ADMIN_SESSION_COOKIE)),
}))
