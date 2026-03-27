import { SaleService } from '@/features/sales/sale-service';
import { withAuth, withErrorHandler, successResponse, notFoundResponse } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async (_request: Request, context: { params: Promise<Record<string, string>> }) => {
    const { id } = await context.params;
    const sale = await SaleService.getById(id);
    if (!sale) return notFoundResponse('Sale');
    return successResponse(sale);
  })
);
