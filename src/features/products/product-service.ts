/**
 * Product Service — Business logic for product management
 */

import { prisma } from '@/lib/db/prisma';
import type { CreateProductInput, UpdateProductInput } from '@/lib/validation/schemas';
import type { PaginationParams } from '@/lib/api/helpers';
import { Prisma } from '@/generated/prisma';

export class ProductService {
  static async getAll(params: PaginationParams) {
    const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, unit: true },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getById(id: string) {
    return prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { category: true, unit: true, productUnits: { include: { unit: true } } },
    });
  }

  static async getByBarcode(barcode: string) {
    return prisma.product.findFirst({
      where: { barcode, deletedAt: null, isActive: true },
      include: { category: true, unit: true },
    });
  }

  static async create(data: CreateProductInput) {
    const product = await prisma.product.create({
      data: {
        ...data,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
      include: { category: true, unit: true },
    });

    // Create stock movement for opening stock
    if (data.currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'OPENING',
          quantity: data.currentStock,
          notes: 'Opening stock',
        },
      });
    }

    return product;
  }

  static async update(id: string, data: UpdateProductInput) {
    return prisma.product.update({
      where: { id },
      data: {
        ...data,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
      include: { category: true, unit: true },
    });
  }

  static async delete(id: string) {
    return prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  static async adjustStock(productId: string, quantity: number, type: 'ADJUSTMENT', notes?: string) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found');

      const newStock = Number(product.currentStock) + quantity;
      if (newStock < 0) throw new Error('Insufficient stock');

      await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          type,
          quantity,
          notes,
        },
      });

      return { ...product, currentStock: newStock };
    });
  }

  static async getLowStock() {
    return prisma.$queryRaw`
      SELECT p.*, c.name as "categoryName"
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      WHERE p."deletedAt" IS NULL
        AND p."isActive" = true
        AND p."currentStock" <= p."minStock"
      ORDER BY p."currentStock" ASC
    `;
  }

  static async search(query: string, limit: number = 10) {
    return prisma.product.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { barcode: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { category: true, unit: true },
      take: limit,
    });
  }
}
