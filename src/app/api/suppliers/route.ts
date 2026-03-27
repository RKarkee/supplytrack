import { SupplierService } from '@/features/suppliers/supplier-service';
import { withAuth, withErrorHandler, successResponse, createdResponse, parsePagination, validateBody } from '@/lib/api';
import { createSupplierSchema } from '@/lib/validation/schemas';

export const GET = withErrorHandler(
  withAuth(async (request: Request) => {
    const params = parsePagination(request.url);
    const result = await SupplierService.getAll(params);
    return successResponse(result.suppliers, {
      page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages,
    });
  })
);

export const POST = withErrorHandler(
  withAuth(async (request: Request) => {
    const { data, error } = await validateBody(request, createSupplierSchema);
    if (error) return error;
    const supplier = await SupplierService.create(data);
    return createdResponse(supplier);
  })
);
