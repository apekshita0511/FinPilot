import type { CookieOptions, Response } from 'express';

import { ACCESS_TOKEN_MAX_AGE_MS, REFRESH_TOKEN_MAX_AGE_MS } from './jwt';
import { env } from './env';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, { ...baseCookieOptions, maxAge: ACCESS_TOKEN_MAX_AGE_MS });
  res.cookie('refresh_token', refreshToken, { ...baseCookieOptions, maxAge: REFRESH_TOKEN_MAX_AGE_MS });
}

export function setAccessCookie(res: Response, accessToken: string) {
  res.cookie('access_token', accessToken, { ...baseCookieOptions, maxAge: ACCESS_TOKEN_MAX_AGE_MS });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('access_token', baseCookieOptions);
  res.clearCookie('refresh_token', baseCookieOptions);
}
