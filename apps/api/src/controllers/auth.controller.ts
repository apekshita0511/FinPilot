import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { setAuthCookies, setAccessCookie, clearAuthCookies } from '../lib/cookies';
import * as authService from '../services/auth.service';
import { ApiError } from '../middleware/errorHandler';
import type { LoginInput, RegisterInput } from '../validation/auth.validation';

export const register = asyncHandler(async (req: Request<unknown, unknown, RegisterInput>, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ user });
});

export const login = asyncHandler(async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ user });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token as string | undefined;
  if (!refreshToken) {
    throw new ApiError(401, 'No refresh token provided');
  }

  const accessToken = await authService.refreshAccessToken(refreshToken);
  setAccessCookie(res, accessToken);
  res.status(204).send();
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookies(res);
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.userId);
  res.json({ user });
});
