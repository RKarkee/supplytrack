import { SaleService } from '@/features/sales/sale-service';
import { withAuth, withErrorHandler, successResponse, createdResponse, validateBody } from '@/lib/api';
import { createSaleSchema } from '@/lib/validation/schemas';

export const GET = withErrorHandler(
  withAuth(async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const search = searchParams.get('search') || undefined;
    const paymentStatus = searchParams.get('paymentStatus') || undefined;

    const result = await SaleService.getAll({ page, limit, search, paymentStatus });
    return successResponse(result.sales, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  })
);

export const POST = withErrorHandler(
  withAuth(async (request: Request, _context, userId: string) => {
    const { data, error } = await validateBody(request, createSaleSchema);
    if (error) return error;
    const sale = await SaleService.create(data, userId);
    return createdResponse(sale);
  })
);
