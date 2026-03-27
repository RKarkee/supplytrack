import { NextRequest } from 'next/server';
import { ProductService } from '@/features/products/product-service';
import { withAuth, withErrorHandler, successResponse, createdResponse, parsePagination, validateBody } from '@/lib/api';
import { createProductSchema } from '@/lib/validation/schemas';

export const GET = withErrorHandler(
  withAuth(async (request: Request) => {
    const params = parsePagination(request.url);
    const result = await ProductService.getAll(params);
    return successResponse(result.products, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  })
);

export const POST = withErrorHandler(
  withAuth(async (request: Request) => {
    const { data, error } = await validateBody(request, createProductSchema);
    if (error) return error;
    const product = await ProductService.create(data);
    return createdResponse(product);
  })
);
