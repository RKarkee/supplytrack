import { ReturnService } from '@/features/returns/return-service';
import { withAuth, withErrorHandler, successResponse, createdResponse, validateBody } from '@/lib/api';
import { createReturnSchema } from '@/lib/validation/schemas';

export const GET = withErrorHandler(
  withAuth(async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const search = searchParams.get('search') || undefined;

    const result = await ReturnService.getAll({ page, limit, search });
    return successResponse(result.returns, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  })
);

export const POST = withErrorHandler(
  withAuth(async (request: Request) => {
    const { data, error } = await validateBody(request, createReturnSchema);
    if (error) return error;

    const ret = await ReturnService.create(data);
    return createdResponse(ret);
  })
);
