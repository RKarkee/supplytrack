import { ProductService } from '@/features/products/product-service';
import { withAuth, withErrorHandler, successResponse } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const products = await ProductService.search(q, limit);
    return successResponse(products);
  })
);
