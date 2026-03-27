import { PurchaseService } from '@/features/purchases/purchase-service';
import { withAuth, withErrorHandler, successResponse, createdResponse, validateBody } from '@/lib/api';
import { createPurchaseOrderSchema } from '@/lib/validation/schemas';

export const GET = withErrorHandler(
  withAuth(async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const supplierId = searchParams.get('supplierId') || undefined;

    const result = await PurchaseService.getAll({ page, limit, search, status, supplierId });
    return successResponse(result.purchaseOrders, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  })
);

export const POST = withErrorHandler(
  withAuth(async (request: Request) => {
    const { data, error } = await validateBody(request, createPurchaseOrderSchema);
    if (error) return error;
    
    const po = await PurchaseService.create(data);
    return createdResponse(po);
  })
);
