import { prisma } from '@/lib/db/prisma';
import { withAuth, withErrorHandler, successResponse } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async () => {
    const units = await prisma.unit.findMany({ orderBy: { name: 'asc' } });
    return successResponse(units);
  })
);
