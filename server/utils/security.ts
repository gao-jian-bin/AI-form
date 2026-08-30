export interface SecurityHeaderOptions {
  production: boolean
  privateRoute: boolean
}

export interface ClientAddressInput {
  trustProxy: boolean
  socketAddress?: string | null
  cfConnectingIp?: string | null
  forwardedFor?: string | null
}

export function securityHeaders(_options: SecurityHeaderOptions): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Security-Policy': [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'self' https:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join('; '),
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  }

  if (_options.production) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
  }
  if (_options.privateRoute) {
    headers['Cache-Control'] = 'no-store, private'
  }

  return headers
}

export function resolveClientAddress(_input: ClientAddressInput): string {
  const validAddress = (value: string | null | undefined): string | null => {
    const candidate = value?.trim()
    return candidate && isIP(candidate) ? candidate : null
  }

  const socketAddress = validAddress(_input.socketAddress)
  if (!_input.trustProxy) return socketAddress || 'unknown'

  const cloudflareAddress = validAddress(_input.cfConnectingIp)
  if (cloudflareAddress) return cloudflareAddress

  const forwardedAddress = validAddress(_input.forwardedFor?.split(',')[0])
  return forwardedAddress || socketAddress || 'unknown'
}
import { isIP } from 'node:net'
