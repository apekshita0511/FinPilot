import jwt from 'jsonwebtoken';

import { env } from './env';

const TOKEN_TTL = '7d';
export const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface TokenPayload {
  sub: string;
}

export function signToken(userId: string): string {
  const payload: TokenPayload = { sub: userId };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): string {
  const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  return decoded.sub;
}
