import { DashboardService } from '@/features/dashboard/dashboard-service';
import { withAuth, withErrorHandler, successResponse } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async () => {
    const summary = await DashboardService.getSummary();
    return successResponse(summary);
  })
);
