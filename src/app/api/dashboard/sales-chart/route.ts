import { DashboardService } from '@/features/dashboard/dashboard-service';
import { withAuth, withErrorHandler, successResponse } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const data = await DashboardService.getSalesChart(days);
    return successResponse(data);
  })
);
