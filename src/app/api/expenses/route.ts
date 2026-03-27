import { prisma } from '@/lib/db/prisma';
import { withAuth, withErrorHandler, successResponse, createdResponse, parsePagination, validateBody } from '@/lib/api';
import { createExpenseSchema } from '@/lib/validation/schemas';

export const GET = withErrorHandler(
  withAuth(async (request: Request) => {
    const params = parsePagination(request.url);
    const skip = (params.page - 1) * params.limit;

    const where = {
      deletedAt: null,
      ...(params.search && {
        description: { contains: params.search, mode: 'insensitive' as const },
      }),
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip,
        take: params.limit,
      }),
      prisma.expense.count({ where }),
    ]);

    return successResponse(expenses, {
      page: params.page, limit: params.limit, total, totalPages: Math.ceil(total / params.limit),
    });
  })
);

export const POST = withErrorHandler(
  withAuth(async (request: Request) => {
    const { data, error } = await validateBody(request, createExpenseSchema);
    if (error) return error;
    const expense = await prisma.expense.create({
      data: { ...data, date: data.date ? new Date(data.date) : new Date() },
      include: { category: true },
    });
    return createdResponse(expense);
  })
);
