import { PurchaseService } from '@/features/purchases/purchase-service';
import { withAuth, withErrorHandler, successResponse } from '@/lib/api';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']),
});

export const PATCH = withErrorHandler(
  withAuth(async (request: Request, context: { params: { id: string } }) => {
    const json = await request.json();
    const { status } = updateStatusSchema.parse(json);
    const po = await PurchaseService.updateStatus(context.params.id, status);
    return successResponse(po);
  })
);
