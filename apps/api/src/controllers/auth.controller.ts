import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { setAuthCookie, clearAuthCookie } from '../lib/cookies';
import * as authService from '../services/auth.service';
import type { LoginInput, RegisterInput } from '../validation/auth.validation';

export const register = asyncHandler(async (req: Request<unknown, unknown, RegisterInput>, res: Response) => {
  const { user, token } = await authService.register(req.body);
  setAuthCookie(res, token);
  res.status(201).json({ user });
});

export const login = asyncHandler(async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
  const { user, token } = await authService.login(req.body);
  setAuthCookie(res, token);
  res.json({ user });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.status(204).send();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.userId);
  res.json({ user });
});
