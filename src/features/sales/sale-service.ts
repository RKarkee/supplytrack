/**
 * Sale Service — POS billing engine with atomic stock deduction
 */

import { prisma } from '@/lib/db/prisma';
import type { CreateSaleInput } from '@/lib/validation/schemas';
import { generateInvoiceNumber, roundCurrency, calculateDiscount, calculateVAT } from '@/lib/utils/currency';

export class SaleService {
  static async create(data: CreateSaleInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      // Get next invoice number
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todaySalesCount = await tx.sale.count({
        where: { createdAt: { gte: todayStart } },
      });
      const invoiceNumber = generateInvoiceNumber(todaySalesCount + 1);

      // Calculate totals
      let subtotal = 0;
      const saleItems = [];

      for (const item of data.items) {
        // Verify stock availability
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        if (Number(product.currentStock) < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.currentStock}`);
        }

        const itemTotal = roundCurrency(item.quantity * item.unitPrice - item.discount);
        subtotal += itemTotal;

        saleItems.push({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: itemTotal,
        });

        // Deduct stock atomically
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { decrement: item.quantity },
          },
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'SALE',
            quantity: -item.quantity,
            reference: invoiceNumber,
          },
        });
      }

      // Calculate discounts
      const discountAmount = data.discountValue
        ? calculateDiscount(subtotal, data.discountType || 'flat', data.discountValue)
        : 0;
      const taxableAmount = roundCurrency(subtotal - discountAmount);
      const vatAmount = data.vatEnabled ? calculateVAT(taxableAmount) : 0;
      const totalAmount = roundCurrency(taxableAmount + vatAmount);

      // Calculate payment totals
      const paidAmount = data.payments
        .filter((p) => p.method !== 'CREDIT')
        .reduce((sum, p) => sum + p.amount, 0);
      const creditAmount = data.payments
        .filter((p) => p.method === 'CREDIT')
        .reduce((sum, p) => sum + p.amount, 0);
      const changeAmount = Math.max(0, roundCurrency(paidAmount - (totalAmount - creditAmount)));

      // Validate credit limit if credit payment
      if (creditAmount > 0 && data.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
        if (customer) {
          const newBalance = Number(customer.creditBalance) + creditAmount;
          if (newBalance > Number(customer.creditLimit)) {
            throw new Error(
              `Credit limit exceeded for ${customer.name}. Limit: Rs ${customer.creditLimit}, Balance: Rs ${customer.creditBalance}, Attempted: Rs ${creditAmount}`
            );
          }
          // Update customer credit balance
          await tx.customer.update({
            where: { id: data.customerId },
            data: { creditBalance: { increment: creditAmount } },
          });
        }
      }

      // Determine payment status
      let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'PAID';
      if (creditAmount >= totalAmount) paymentStatus = 'UNPAID';
      else if (creditAmount > 0) paymentStatus = 'PARTIAL';

      // Create sale
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: data.customerId || null,
          userId,
          subtotal,
          discountType: data.discountType || null,
          discountValue: data.discountValue,
          discountAmount,
          taxableAmount,
          vatAmount,
          totalAmount,
          paidAmount,
          creditAmount,
          changeAmount,
          paymentStatus,
          notes: data.notes || null,
          isOfflineSale: data.isOfflineSale,
          items: { create: saleItems },
          payments: {
            create: data.payments.map((p) => ({
              method: p.method,
              amount: p.amount,
              reference: p.reference || null,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          payments: true,
          customer: true,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'SALE',
          entity: 'Sale',
          entityId: sale.id,
          details: JSON.stringify({
            invoiceNumber,
            totalAmount,
            paymentStatus,
            itemCount: saleItems.length,
          }),
        },
      });

      return sale;
    }, {
      timeout: 10000, // 10 second timeout for transaction
    });
  }

  static async getAll(params: {
    page: number;
    limit: number;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    paymentStatus?: string;
  }) {
    const { page, limit, search, startDate, endDate, paymentStatus } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (startDate && endDate) {
      where.createdAt = { gte: startDate, lte: endDate };
    }
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: true,
          items: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    return {
      sales,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getById(id: string) {
    return prisma.sale.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true,
        user: { select: { name: true } },
      },
    });
  }

  static async getTodaySummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [sales, totalRevenue, totalSales] = await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte: todayStart, lte: todayEnd }, deletedAt: null },
        include: { payments: true },
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: todayStart, lte: todayEnd }, deletedAt: null },
        _sum: { totalAmount: true, vatAmount: true, discountAmount: true, creditAmount: true },
        _count: true,
      }),
      prisma.sale.count({
        where: { createdAt: { gte: todayStart, lte: todayEnd }, deletedAt: null },
      }),
    ]);

    return {
      totalSales,
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      totalVAT: Number(totalRevenue._sum.vatAmount || 0),
      totalDiscount: Number(totalRevenue._sum.discountAmount || 0),
      totalCredit: Number(totalRevenue._sum.creditAmount || 0),
      cashReceived: sales.reduce(
        (sum, s) => sum + s.payments.filter((p) => p.method === 'CASH').reduce((ps, p) => ps + Number(p.amount), 0),
        0
      ),
    };
  }
}
