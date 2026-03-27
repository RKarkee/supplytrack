import { prisma } from '@/lib/db/prisma';
import { withAuth, withErrorHandler, successResponse, createdResponse, validateBody } from '@/lib/api';
import { createExpenseCategorySchema } from '@/lib/validation/schemas';

export const GET = withErrorHandler(
  withAuth(async () => {
    const categories = await prisma.expenseCategory.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return successResponse(categories);
  })
);

export const POST = withErrorHandler(
  withAuth(async (request: Request) => {
    const { data, error } = await validateBody(request, createExpenseCategorySchema);
    if (error) return error;
    const category = await prisma.expenseCategory.create({ data });
    return createdResponse(category);
  })
);
