import { ProductService } from '@/features/products/product-service';
import { withAuth, withErrorHandler, successResponse, notFoundResponse, validateBody } from '@/lib/api';
import { updateProductSchema } from '@/lib/validation/schemas';

export const GET = withErrorHandler(
  withAuth(async (_request: Request, context: { params: Promise<Record<string, string>> }) => {
    const { id } = await context.params;
    const product = await ProductService.getById(id);
    if (!product) return notFoundResponse('Product');
    return successResponse(product);
  })
);

export const PUT = withErrorHandler(
  withAuth(async (request: Request, context: { params: Promise<Record<string, string>> }) => {
    const { id } = await context.params;
    const { data, error } = await validateBody(request, updateProductSchema);
    if (error) return error;
    const product = await ProductService.update(id, data);
    return successResponse(product);
  })
);

export const DELETE = withErrorHandler(
  withAuth(async (_request: Request, context: { params: Promise<Record<string, string>> }) => {
    const { id } = await context.params;
    await ProductService.delete(id);
    return successResponse({ deleted: true });
  })
);
