import { ProductService } from '@/features/products/product-service';
import { withAuth, withErrorHandler, successResponse, notFoundResponse } from '@/lib/api';

export const GET = withErrorHandler(
  withAuth(async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('code');
    if (!barcode) return notFoundResponse('Barcode parameter required');
    
    const product = await ProductService.getByBarcode(barcode);
    if (!product) return notFoundResponse('Product');
    return successResponse(product);
  })
);
