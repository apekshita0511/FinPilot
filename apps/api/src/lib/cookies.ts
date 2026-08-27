import type { CookieOptions, Response } from 'express';

import { TOKEN_MAX_AGE_MS } from './jwt';
import { env } from './env';

const AUTH_COOKIE = 'token';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
};

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, { ...baseCookieOptions, maxAge: TOKEN_MAX_AGE_MS });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, baseCookieOptions);
}
