/**
 * Singleton token store — holds the access token in memory and registers
 * the refresh function. Kept separate from auth.ts to avoid circular deps
 * (api.ts imports this, auth.ts also imports this).
 */

let _accessToken: string | null = null
type RefreshFn = () => Promise<string | null>
let _refreshFn: RefreshFn | null = null

export const getAccessToken = (): string | null => _accessToken

export const setAccessToken = (token: string | null): void => {
  _accessToken = token
}

export const registerRefreshFn = (fn: RefreshFn): void => {
  _refreshFn = fn
}

export const callRefreshFn = (): Promise<string | null> => {
  if (_refreshFn) return _refreshFn()
  return Promise.resolve(null)
}

/**
 * Decode a JWT payload without verification (client-side only).
 * Returns an empty object on failure.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    if (!payload) return {}
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return {}
  }
}
