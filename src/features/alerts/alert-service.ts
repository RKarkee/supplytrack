import { prisma } from '@/lib/db/prisma';

export class AlertService {
  static async generateAlerts() {
    return prisma.$transaction(async (tx) => {
      // 1. Low Stock Alerts
      const lowStockProducts = await tx.product.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          currentStock: { lte: prisma.product.fields.minStock },
        },
      });

      for (const product of lowStockProducts) {
        if (Number(product.currentStock) <= 0) {
          await this.createOrUpdateAlert(tx, {
            type: 'OUT_OF_STOCK',
            severity: 'CRITICAL',
            title: 'Out of Stock',
            message: `${product.name} is completely out of stock.`,
            productId: product.id,
          });
        } else {
          await this.createOrUpdateAlert(tx, {
            type: 'LOW_STOCK',
            severity: 'HIGH',
            title: 'Low Stock',
            message: `${product.name} has fallen below minimum stock level (${product.minStock}). Current: ${product.currentStock}`,
            productId: product.id,
          });
        }
      }

      // 2. Overdue Credit / Max limit reached
      const limitReachedCustomers = await tx.customer.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          creditBalance: { gt: 0 },
        },
      });

      for (const customer of limitReachedCustomers) {
        if (Number(customer.creditBalance) >= Number(customer.creditLimit) && Number(customer.creditLimit) > 0) {
          await this.createOrUpdateAlert(tx, {
            type: 'OVERDUE_CREDIT',
            severity: 'HIGH',
            title: 'Credit Limit Reached',
            message: `${customer.name} has reached their credit limit of Rs ${customer.creditLimit}.`,
            customerId: customer.id,
          });
        }
      }

      // Cleanup resolved alerts (e.g. stock was refilled, credit was paid)
      // For LOW_STOCK: if product.currentStock > minStock
      // We could do this dynamically or just mark all unread alerts as read if condition no longer holds.
      const lowStockAlerts = await tx.alert.findMany({
        where: { type: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] }, isRead: false },
      });

      for (const alert of lowStockAlerts) {
        if (!alert.productId) continue;
        const p = await tx.product.findUnique({ where: { id: alert.productId } });
        if (p && Number(p.currentStock) > Number(p.minStock)) {
          await tx.alert.update({ where: { id: alert.id }, data: { isRead: true, isDismissed: true } });
        }
      }

      return { success: true };
    });
  }

  private static async createOrUpdateAlert(tx: any, data: {
    type: string;
    severity: string;
    title: string;
    message: string;
    productId?: string;
    customerId?: string;
  }) {
    // Check if unread alert already exists for this entity
    const existing = await tx.alert.findFirst({
      where: {
        type: data.type as any,
        productId: data.productId,
        customerId: data.customerId,
        isRead: false,
      },
    });

    if (!existing) {
      await tx.alert.create({
        data: {
          type: data.type as any,
          severity: data.severity as any,
          title: data.title,
          message: data.message,
          productId: data.productId,
          customerId: data.customerId,
        },
      });
    }
  }

  static async getUnreadAlerts() {
    return prisma.alert.findMany({
      where: { isRead: false, isDismissed: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  static async markAsRead(id: string) {
    return prisma.alert.update({
      where: { id },
      data: { isRead: true },
    });
  }
}
