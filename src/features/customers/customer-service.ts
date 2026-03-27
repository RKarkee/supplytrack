/**
 * Customer Service
 */

import { prisma } from '@/lib/db/prisma';
import type { CreateCustomerInput, UpdateCustomerInput } from '@/lib/validation/schemas';
import type { PaginationParams } from '@/lib/api/helpers';

export class CustomerService {
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

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.customer.count({ where }),
    ]);

    return { customers, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id: string) {
    return prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        sales: { orderBy: { createdAt: 'desc' }, take: 10, include: { payments: true } },
      },
    });
  }

  static async create(data: CreateCustomerInput) {
    return prisma.customer.create({ data });
  }

  static async update(id: string, data: UpdateCustomerInput) {
    return prisma.customer.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  static async search(query: string, limit: number = 10) {
    return prisma.customer.findMany({
      where: {
        deletedAt: null, isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
    });
  }

  static async payCredit(customerId: string, amount: number) {
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new Error('Customer not found');

      const currentBalance = Number(customer.creditBalance);
      if (amount > currentBalance) throw new Error('Payment exceeds credit balance');

      return tx.customer.update({
        where: { id: customerId },
        data: { creditBalance: { decrement: amount } },
      });
    });
  }
}
