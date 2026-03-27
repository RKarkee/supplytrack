import { PurchaseService } from '@/features/purchases/purchase-service';
import { withAuth, withErrorHandler, successResponse, validateBody } from '@/lib/api';
import { receivePurchaseSchema } from '@/lib/validation/schemas';

export const POST = withErrorHandler(
  withAuth(async (request: Request, context: { params: { id: string } }, userId: string) => {
    const { data, error } = await validateBody(request, receivePurchaseSchema);
    if (error) return error;

    const po = await PurchaseService.receive(context.params.id, data, userId);
    return successResponse(po);
  })
);
