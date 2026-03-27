import { AlertService } from '@/features/alerts/alert-service';
import { withAuth, withErrorHandler, successResponse } from '@/lib/api';

export const POST = withErrorHandler(
  withAuth(async () => {
    const result = await AlertService.generateAlerts();
    return successResponse(result);
  })
);
