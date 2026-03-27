import { CustomerService } from '@/features/customers/customer-service';
import { withAuth, withErrorHandler, successResponse, createdResponse, parsePagination, validateBody } from '@/lib/api';
import { createCustomerSchema } from '@/lib/validation/schemas';

export const GET = withErrorHandler(
  withAuth(async (request: Request) => {
    const params = parsePagination(request.url);
    const result = await CustomerService.getAll(params);
    return successResponse(result.customers, {
      page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages,
    });
  })
);

export const POST = withErrorHandler(
  withAuth(async (request: Request) => {
    const { data, error } = await validateBody(request, createCustomerSchema);
    if (error) return error;
    const customer = await CustomerService.create(data);
    return createdResponse(customer);
  })
);
