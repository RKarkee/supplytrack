import { runAnalytics, getAnalyticsSummary, getSalesHeatmapData } from '@/lib/ai';
import { withAuth, withErrorHandler, successResponse } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async () => {
    const [summary, heatmap] = await Promise.all([
      getAnalyticsSummary(),
      getSalesHeatmapData(),
    ]);
    return successResponse({ summary, heatmap });
  })
);

export const POST = withErrorHandler(
  withAuth(async () => {
    const result = await runAnalytics();
    return successResponse(result);
  })
);
