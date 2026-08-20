import { listCategories } from '../utils/database'
import { getForumDatabase } from '../utils/forum'

export default defineEventHandler(() => listCategories(getForumDatabase()))
