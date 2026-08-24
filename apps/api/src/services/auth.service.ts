import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { DEFAULT_CATEGORIES } from '../lib/defaultCategories';
import { ApiError } from '../middleware/errorHandler';
import type { LoginInput, RegisterInput } from '../validation/auth.validation';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function register(input: RegisterInput) {
  const email = normalizeEmail(input.email);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, passwordHash, name: input.name },
      select: SAFE_USER_SELECT,
    });

    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: created.id })),
    });

    return created;
  });

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  return { user, accessToken, refreshToken };
}

export async function login(input: LoginInput) {
  const email = normalizeEmail(input.email);

  const user = await prisma.user.findUnique({ where: { email } });

  // Same error for "no such user" and "wrong password" — don't leak which
  // one it was.
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string) {
  let userId: string;
  try {
    userId = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  return signAccessToken(user.id);
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: SAFE_USER_SELECT });
  if (!user) {
    throw new ApiError(401, 'User no longer exists');
  }
  return user;
}
