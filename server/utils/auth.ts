import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type Database from 'better-sqlite3'

const PASSWORD_KEY_BYTES = 64
const DEFAULT_SESSION_SECONDS = 7 * 24 * 60 * 60

function tokenDigest(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function hashPassword(password: string, salt = randomBytes(16)): string {
  if (password.length < 12) throw new Error('管理员密码至少需要 12 个字符')
  const key = scryptSync(password, salt, PASSWORD_KEY_BYTES)
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`
}

export function verifyPassword(password: string, encodedHash: string): boolean {
  const [algorithm, saltValue, keyValue] = encodedHash.split('$')
  if (algorithm !== 'scrypt' || !saltValue || !keyValue) return false

  try {
    const salt = Buffer.from(saltValue, 'base64url')
    const expectedKey = Buffer.from(keyValue, 'base64url')
    const suppliedKey = scryptSync(password, salt, expectedKey.length)
    return expectedKey.length === suppliedKey.length && timingSafeEqual(expectedKey, suppliedKey)
  } catch {
    return false
  }
}

export function createAdminSession(
  db: Database.Database,
  issuedAt = new Date(),
  lifetimeSeconds = DEFAULT_SESSION_SECONDS,
): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(issuedAt.getTime() + lifetimeSeconds * 1000)

  db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(issuedAt.toISOString())
  db.prepare(`
    INSERT INTO admin_sessions (token_hash, created_at, expires_at)
    VALUES (?, ?, ?)
  `).run(tokenDigest(token), issuedAt.toISOString(), expiresAt.toISOString())

  return { token, expiresAt }
}

export function validateAdminSession(
  db: Database.Database,
  token: string | null | undefined,
  now = new Date(),
): boolean {
  if (!token) return false
  db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(now.toISOString())
  const session = db.prepare(`
    SELECT id FROM admin_sessions
    WHERE token_hash = ? AND expires_at > ?
  `).get(tokenDigest(token), now.toISOString())
  return Boolean(session)
}

export function revokeAdminSession(db: Database.Database, token: string | null | undefined): void {
  if (!token) return
  db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenDigest(token))
}

interface LoginAttemptLimiterOptions {
  maxAttempts: number
  windowMs: number
}

export class LoginAttemptLimiter {
  private readonly attempts = new Map<string, number[]>()

  constructor(private readonly options: LoginAttemptLimiterOptions) {}

  private recentAttempts(key: string, now: Date): number[] {
    const cutoff = now.getTime() - this.options.windowMs
    const recent = (this.attempts.get(key) ?? []).filter(timestamp => timestamp > cutoff)
    if (recent.length) this.attempts.set(key, recent)
    else this.attempts.delete(key)
    return recent
  }

  canAttempt(key: string, now = new Date()): boolean {
    return this.recentAttempts(key, now).length < this.options.maxAttempts
  }

  recordFailure(key: string, now = new Date()): void {
    const recent = this.recentAttempts(key, now)
    recent.push(now.getTime())
    this.attempts.set(key, recent)
  }

  reset(key: string): void {
    this.attempts.delete(key)
  }
}
