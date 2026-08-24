import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';
import { isUniqueViolation } from '../lib/prismaErrors';
import type { CreateCategoryInput, UpdateCategoryInput } from '../validation/category.validation';

export async function listCategories(userId: string) {
  return prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } });
}

export async function createCategory(userId: string, input: CreateCategoryInput) {
  try {
    return await prisma.category.create({ data: { ...input, userId } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, 'A category with this name already exists');
    }
    throw err;
  }
}

export async function updateCategory(userId: string, categoryId: string, input: UpdateCategoryInput) {
  const existing = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!existing) {
    throw new ApiError(404, 'Category not found');
  }

  try {
    return await prisma.category.update({ where: { id: categoryId }, data: input });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, 'A category with this name already exists');
    }
    throw err;
  }
}

export async function deleteCategory(userId: string, categoryId: string) {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    include: { _count: { select: { transactions: true, budgets: true } } },
  });
  if (!existing) {
    throw new ApiError(404, 'Category not found');
  }

  if (existing._count.transactions > 0 || existing._count.budgets > 0) {
    throw new ApiError(409, 'Category is in use by existing transactions or budgets and cannot be deleted');
  }

  await prisma.category.delete({ where: { id: categoryId } });
}
