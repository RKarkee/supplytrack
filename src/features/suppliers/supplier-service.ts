/**
 * Supplier Service
 */

import { prisma } from '@/lib/db/prisma';
import type { CreateSupplierInput, UpdateSupplierInput } from '@/lib/validation/schemas';
import type { PaginationParams } from '@/lib/api/helpers';

export class SupplierService {
  static async getAll(params: PaginationParams) {
    const { page, limit, search, sortBy = 'name', sortOrder = 'asc' } = params;
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.supplier.count({ where }),
    ]);

    return { suppliers, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id: string) {
    return prisma.supplier.findFirst({
      where: { id, deletedAt: null },
      include: { purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
  }

  static async create(data: CreateSupplierInput) {
    return prisma.supplier.create({ data });
  }

  static async update(id: string, data: UpdateSupplierInput) {
    return prisma.supplier.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.supplier.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  static async search(query: string, limit: number = 10) {
    return prisma.supplier.findMany({
      where: {
        deletedAt: null, isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { contactPerson: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
    });
  }
}
