import jwt from 'jsonwebtoken';

import { env } from './env';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';

export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface TokenPayload {
  sub: string;
  type: 'access' | 'refresh';
}

export function signAccessToken(userId: string): string {
  const payload: TokenPayload = { sub: userId, type: 'access' };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(userId: string): string {
  const payload: TokenPayload = { sub: userId, type: 'refresh' };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyAccessToken(token: string): string {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  if (decoded.type !== 'access') {
    throw new Error('Not an access token');
  }
  return decoded.sub;
}

export function verifyRefreshToken(token: string): string {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Not a refresh token');
  }
  return decoded.sub;
}
