import { prisma } from '@/lib/db/prisma';
import type { CreateReturnInput } from '@/lib/validation/schemas';
import { generateReturnNumber } from '@/lib/utils/currency';

export class ReturnService {
  static async create(data: CreateReturnInput) {
    return prisma.$transaction(async (tx) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const count = await tx.return.count({
        where: { createdAt: { gte: todayStart } },
      });
      const returnNumber = generateReturnNumber(count + 1);

      let totalAmount = 0;
      const returnItems = [];

      for (const item of data.items) {
        const itemTotal = Number(item.quantity) * Number(item.unitPrice);
        totalAmount += itemTotal;
        returnItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: itemTotal,
        });

        // Add back to stock
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } }
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'RETURN_IN',
            quantity: item.quantity,
            reference: returnNumber,
            notes: data.reason || 'Customer Return',
          }
        });
      }

      // If customer is selected and type is REFUND, reduce their debt
      if (data.customerId && data.type === 'REFUND') {
        const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
        if (customer && Number(customer.creditBalance) > 0) {
          // Only decrement up to what they owe
          const decrementAmount = Math.min(Number(customer.creditBalance), totalAmount);
          await tx.customer.update({
            where: { id: data.customerId },
            data: { creditBalance: { decrement: decrementAmount } }
          });
        }
      }

      const ret = await tx.return.create({
        data: {
          returnNumber,
          saleId: data.saleId,
          customerId: data.customerId || null,
          type: data.type,
          totalAmount,
          reason: data.reason || null,
          notes: data.notes || null,
          items: { create: returnItems }
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          sale: true,
        }
      });

      return ret;
    });
  }

  static async getAll(params: {
    page: number;
    limit: number;
    search?: string;
  }) {
    const skip = (params.page - 1) * params.limit;
    const where: any = {};
    if (params.search) {
      where.OR = [
        { returnNumber: { contains: params.search, mode: 'insensitive' } },
        { sale: { invoiceNumber: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [returns, total] = await Promise.all([
      prisma.return.findMany({
        where,
        include: { customer: true, items: true, sale: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: params.limit,
      }),
      prisma.return.count({ where }),
    ]);

    return { 
      returns, 
      total, 
      page: params.page, 
      limit: params.limit, 
      totalPages: Math.ceil(total / params.limit) 
    };
  }
}
