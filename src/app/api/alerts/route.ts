import { AlertService } from '@/features/alerts/alert-service';
import { withAuth, withErrorHandler, successResponse } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async () => {
    const alerts = await AlertService.getUnreadAlerts();
    return successResponse(alerts);
  })
);
