import { describe, expect, it } from 'vitest'
import { resolveClientAddress, securityHeaders } from '../server/utils/security'

describe('security headers', () => {
  it('prevents framing, MIME sniffing, referrer leakage, and unnecessary device access', () => {
    const headers = securityHeaders({ production: true, privateRoute: false })

    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(headers['Content-Security-Policy']).toContain("object-src 'none'")
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Permissions-Policy']).toContain('camera=()')
    expect(headers['Strict-Transport-Security']).toContain('max-age=')
  })

  it('marks administrator and authentication responses as private and uncacheable', () => {
    expect(securityHeaders({ production: true, privateRoute: true })['Cache-Control'])
      .toBe('no-store, private')
  })
})

describe('client address resolution', () => {
  it('ignores spoofable forwarding headers unless a trusted proxy is configured', () => {
    const input = {
      socketAddress: '127.0.0.1',
      cfConnectingIp: '203.0.113.8',
      forwardedFor: '198.51.100.10, 127.0.0.1',
    }

    expect(resolveClientAddress({ ...input, trustProxy: false })).toBe('127.0.0.1')
    expect(resolveClientAddress({ ...input, trustProxy: true })).toBe('203.0.113.8')
  })

  it('falls back from malformed proxy values to the real socket address', () => {
    expect(resolveClientAddress({
      trustProxy: true,
      socketAddress: '10.0.0.4',
      cfConnectingIp: 'not-an-ip',
      forwardedFor: 'also-invalid',
    })).toBe('10.0.0.4')
  })
})
