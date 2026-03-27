import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { ZodSchema, ZodError } from 'zod';

// ─── Types ──────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Response Helpers ───────────────────────────────────

export function successResponse<T>(data: T, meta?: ApiResponse['meta']): NextResponse {
  return NextResponse.json({ success: true, data, meta }, { status: 200 });
}

export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function errorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function validationErrorResponse(errors: Record<string, string[]>): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Validation failed', errors },
    { status: 422 }
  );
}

export function notFoundResponse(entity: string = 'Resource'): NextResponse {
  return NextResponse.json(
    { success: false, error: `${entity} not found` },
    { status: 404 }
  );
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}

// ─── Middleware Wrappers ────────────────────────────────

type ApiHandler = (
  request: Request,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wrap API handler with authentication check
 */
export function withAuth(handler: (request: Request, context: { params: Promise<Record<string, string>> }, userId: string) => Promise<NextResponse>): ApiHandler {
  return async (request, context) => {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }
    return handler(request, context, session.user.id);
  };
}

/**
 * Validate request body with Zod schema
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (err) {
    if (err instanceof ZodError) {
      const errors: Record<string, string[]> = {};
      err.errors.forEach((e) => {
        const path = e.path.join('.');
        if (!errors[path]) errors[path] = [];
        errors[path].push(e.message);
      });
      return { error: validationErrorResponse(errors) };
    }
    return { error: errorResponse('Invalid request body') };
  }
}

/**
 * Parse pagination params from URL search params
 */
export function parsePagination(url: string): PaginationParams {
  const { searchParams } = new URL(url);
  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1')),
    limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20'))),
    search: searchParams.get('search') || undefined,
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
  };
}

/**
 * Global error handler wrapper
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      console.error('API Error:', err);
      const message = err instanceof Error ? err.message : 'Internal server error';
      return errorResponse(message, 500);
    }
  };
}
