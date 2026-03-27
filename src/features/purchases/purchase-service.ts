import { prisma } from '@/lib/db/prisma';
import type { CreatePurchaseOrderInput, receivePurchaseSchema } from '@/lib/validation/schemas';
import { generatePONumber, roundCurrency } from '@/lib/utils/currency';
import { z } from 'zod';

type ReceivePurchaseInput = z.infer<typeof receivePurchaseSchema>;

export class PurchaseService {
  static async create(data: CreatePurchaseOrderInput) {
    return prisma.$transaction(async (tx) => {
      // Get next PO number
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayPOCount = await tx.purchaseOrder.count({
        where: { createdAt: { gte: todayStart } },
      });
      const orderNumber = generatePONumber(todayPOCount + 1);

      // Calculate totals
      let subtotal = 0;
      const poItems = [];

      for (const item of data.items) {
        const itemTotal = roundCurrency(item.quantity * item.unitPrice);
        subtotal += itemTotal;
        poItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: itemTotal,
        });
      }

      const totalAmount = roundCurrency(subtotal + (data.taxAmount || 0));

      // Create Purchase Order
      const po = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: data.supplierId,
          status: 'DRAFT',
          subtotal,
          taxAmount: data.taxAmount || 0,
          totalAmount,
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          notes: data.notes || null,
          items: { create: poItems },
        },
        include: {
          items: { include: { product: true } },
          supplier: true,
        },
      });

      return po;
    });
  }

  static async getAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    supplierId?: string;
  }) {
    const { page, limit, search, status, supplierId } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { deletedAt: null };
    
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    if (supplierId) {
      where.supplierId = supplierId;
    }

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          _count: {
            select: { items: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return {
      purchaseOrders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getById(id: string) {
    return prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
  }

  static async updateStatus(id: string, status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED') {
    return prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: { supplier: true }
    });
  }

  static async receive(id: string, data: ReceivePurchaseInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!po) throw new Error('Purchase order not found');
      if (po.status === 'RECEIVED') throw new Error('Purchase order is already received');

      let allItemsFullyReceived = true;

      for (const receiveItem of data.items) {
        const poItem = po.items.find(i => i.id === receiveItem.purchaseItemId);
        if (!poItem) throw new Error(`Item ${receiveItem.purchaseItemId} not found in PO`);

        const newReceivedQty = Number(poItem.receivedQty) + receiveItem.receivedQty;
        
        // Update the received quantity
        await tx.purchaseItem.update({
          where: { id: poItem.id },
          data: { receivedQty: newReceivedQty }
        });

        // Add to actual product stock
        if (receiveItem.receivedQty > 0) {
          await tx.product.update({
            where: { id: poItem.productId },
            data: { currentStock: { increment: receiveItem.receivedQty } }
          });

          // Create stock movement
          await tx.stockMovement.create({
            data: {
              productId: poItem.productId,
              type: 'PURCHASE',
              quantity: receiveItem.receivedQty,
              reference: po.orderNumber,
              notes: 'Received from PO',
            }
          });
        }

        if (newReceivedQty < Number(poItem.quantity)) {
          allItemsFullyReceived = false;
        }
      }

      // If all items are fully received, mark PO as RECEIVED
      const newStatus = allItemsFullyReceived ? 'RECEIVED' : 'CONFIRMED';
      
      const updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data: { 
          status: newStatus,
          receivedDate: allItemsFullyReceived ? new Date() : undefined
        },
        include: {
          items: { include: { product: true } },
          supplier: true,
        }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RECEIVE_PO',
          entity: 'PurchaseOrder',
          entityId: updatedPo.id,
          details: JSON.stringify({
            orderNumber: updatedPo.orderNumber,
            status: newStatus,
            itemsReceived: data.items.length
          }),
        },
      });

      return updatedPo;
    });
  }

  static async delete(id: string) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new Error('Purchase order not found');
    if (po.status === 'RECEIVED') throw new Error('Cannot delete a completely received purchase order');

    return prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'CANCELLED' }
    });
  }
}
