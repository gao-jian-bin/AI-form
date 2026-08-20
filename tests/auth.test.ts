import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createForumDatabase, migrateForumDatabase } from '../server/utils/database'
import {
  LoginAttemptLimiter,
  createAdminSession,
  hashPassword,
  revokeAdminSession,
  validateAdminSession,
  verifyPassword,
} from '../server/utils/auth'

describe('password hashing', () => {
  it('verifies the intended password without storing it in the encoded hash', () => {
    const encoded = hashPassword('correct horse battery staple', Buffer.alloc(16, 7))

    expect(encoded).not.toContain('correct horse battery staple')
    expect(verifyPassword('correct horse battery staple', encoded)).toBe(true)
    expect(verifyPassword('wrong password', encoded)).toBe(false)
  })
})

describe('admin sessions', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createForumDatabase(':memory:')
    migrateForumDatabase(db)
  })

  afterEach(() => db.close())

  it('accepts a fresh opaque session, rejects it after expiry, and stores no raw token', () => {
    const issuedAt = new Date('2026-08-20T00:00:00.000Z')
    const session = createAdminSession(db, issuedAt, 60)
    const stored = db.prepare('SELECT token_hash FROM admin_sessions').get() as { token_hash: string }

    expect(stored.token_hash).not.toBe(session.token)
    expect(validateAdminSession(db, session.token, new Date('2026-08-20T00:00:30.000Z'))).toBe(true)
    expect(validateAdminSession(db, session.token, new Date('2026-08-20T00:01:01.000Z'))).toBe(false)
  })

  it('revokes a session immediately on sign out', () => {
    const session = createAdminSession(db)

    revokeAdminSession(db, session.token)

    expect(validateAdminSession(db, session.token)).toBe(false)
  })
})

describe('login attempt limiting', () => {
  it('blocks an address after five failures and allows it after the window', () => {
    const limiter = new LoginAttemptLimiter({ maxAttempts: 5, windowMs: 15 * 60_000 })
    const start = new Date('2026-08-20T00:00:00.000Z')

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(limiter.canAttempt('127.0.0.1', start)).toBe(true)
      limiter.recordFailure('127.0.0.1', start)
    }

    expect(limiter.canAttempt('127.0.0.1', start)).toBe(false)
    expect(limiter.canAttempt('127.0.0.1', new Date('2026-08-20T00:16:00.000Z'))).toBe(true)
  })

  it('clears failures after a successful login', () => {
    const limiter = new LoginAttemptLimiter({ maxAttempts: 2, windowMs: 60_000 })
    limiter.recordFailure('visitor', new Date())
    limiter.reset('visitor')

    expect(limiter.canAttempt('visitor', new Date())).toBe(true)
  })
})
