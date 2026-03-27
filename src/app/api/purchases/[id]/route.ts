import { PurchaseService } from '@/features/purchases/purchase-service';
import { withAuth, withErrorHandler, successResponse } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async (request: Request, context: { params: { id: string } }) => {
    const po = await PurchaseService.getById(context.params.id);
    if (!po) return Response.json({ success: false, error: 'Purchase order not found' }, { status: 404 });
    return successResponse(po);
  })
);

export const DELETE = withErrorHandler(
  withAuth(async (request: Request, context: { params: { id: string } }) => {
    await PurchaseService.delete(context.params.id);
    return successResponse({ message: 'Purchase order cancelled successfully' });
  })
);
