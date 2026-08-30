import { describe, expect, it } from 'vitest'
import {
  composerDraftKey,
  parseComposerDraft,
  serializeComposerDraft,
  type ComposerDraftFields,
} from '../app/utils/composer-draft'

const fields: ComposerDraftFields = {
  title: '尚未保存的标题',
  slug: 'draft-title',
  excerpt: '',
  categorySlug: 'chatgpt',
  tags: ['Prompt'],
  contentMarkdown: '本地正文',
  externalUrl: '',
  isPinned: false,
  publishedAt: '2026-08-20T08:00',
}

describe('composer draft recovery', () => {
  it('isolates new posts and existing topics with stable storage keys', () => {
    expect(composerDraftKey()).toBe('ai-forum:composer-draft:new')
    expect(composerDraftKey(12)).toBe('ai-forum:composer-draft:topic:12')
    expect(composerDraftKey(13)).not.toBe(composerDraftKey(12))
  })

  it('round-trips valid fields without accepting malformed browser data', () => {
    const serialized = serializeComposerDraft(fields, new Date('2026-08-21T08:00:00.000Z'))

    expect(parseComposerDraft(serialized)).toEqual({
      version: 1,
      savedAt: '2026-08-21T08:00:00.000Z',
      fields,
    })
    expect(parseComposerDraft('{broken')).toBeNull()
    expect(parseComposerDraft(JSON.stringify({ version: 1, savedAt: 'today', fields: {} }))).toBeNull()
  })

  it('offers only drafts newer than the current server topic', () => {
    const serialized = serializeComposerDraft(fields, new Date('2026-08-21T08:00:00.000Z'))

    expect(parseComposerDraft(serialized, '2026-08-20T08:00:00.000Z')).not.toBeNull()
    expect(parseComposerDraft(serialized, '2026-08-22T08:00:00.000Z')).toBeNull()
  })
})
