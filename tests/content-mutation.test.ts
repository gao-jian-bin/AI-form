import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import {
  createForumDatabase,
  ensureBaseCategories,
  listTopicMarkdownSources,
  migrateForumDatabase,
  saveTopic,
} from '../server/utils/database'
import { withMediaReferenceLock } from '../server/utils/media-reference-lock'
import { deleteStoredImage, referencedUploadPaths } from '../server/utils/uploads'

describe('media reference mutations', () => {
  let db: Database.Database
  let uploadRoot: string

  beforeEach(async () => {
    db = createForumDatabase(':memory:')
    migrateForumDatabase(db)
    ensureBaseCategories(db)
    uploadRoot = await mkdtemp(join(tmpdir(), 'ai-forum-media-lock-'))
  })

  afterEach(async () => {
    db.close()
    await rm(uploadRoot, { recursive: true, force: true })
  })

  it('makes a concurrent cleanup observe a topic reference saved first', async () => {
    const uploadPath = '2026/08/123e4567-e89b-42d3-a456-426614174000.png'
    await mkdir(join(uploadRoot, '2026', '08'), { recursive: true })
    await writeFile(join(uploadRoot, ...uploadPath.split('/')), Buffer.from('image'))
    let releaseSave!: () => void
    const saveMayContinue = new Promise<void>(resolve => { releaseSave = resolve })

    const save = withMediaReferenceLock(async () => {
      await saveMayContinue
      saveTopic(db, {
        title: '并发引用', categorySlug: 'chatgpt',
        contentMarkdown: `![图](/uploads/${uploadPath})`, status: 'published',
        tags: [], isPinned: false, externalUrl: null,
      })
    })
    const cleanup = withMediaReferenceLock(async () => {
      const references = referencedUploadPaths(listTopicMarkdownSources(db))
      return deleteStoredImage(uploadRoot, uploadPath, references)
    })

    releaseSave()
    await save
    await expect(cleanup).rejects.toThrow('图片仍被帖子引用')
  })
})
