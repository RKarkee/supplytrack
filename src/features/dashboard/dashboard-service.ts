/**
 * Dashboard Service — Aggregated analytics for the dashboard
 */

import { prisma } from '@/lib/db/prisma';

export class DashboardService {
  static async getSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      todaySales,
      monthSales,
      totalProducts,
      lowStockCount,
      totalCustomers,
      pendingCredit,
      recentSales,
      topProducts,
      todayExpenses,
    ] = await Promise.all([
      // Today's sales
      prisma.sale.aggregate({
        where: { createdAt: { gte: todayStart, lte: todayEnd }, deletedAt: null },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Month's sales
      prisma.sale.aggregate({
        where: { createdAt: { gte: monthStart }, deletedAt: null },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Total products
      prisma.product.count({ where: { isActive: true, deletedAt: null } }),
      // Low stock products
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM "Product"
        WHERE "deletedAt" IS NULL AND "isActive" = true
        AND "currentStock" <= "minStock"
      `,
      // Total customers
      prisma.customer.count({ where: { isActive: true, deletedAt: null } }),
      // Pending credit
      prisma.customer.aggregate({
        where: { creditBalance: { gt: 0 }, isActive: true },
        _sum: { creditBalance: true },
      }),
      // Recent 5 sales
      prisma.sale.findMany({
        where: { deletedAt: null },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Top 5 products by quantity sold this month
      prisma.saleItem.groupBy({
        by: ['productId', 'productName'],
        where: {
          sale: { createdAt: { gte: monthStart }, deletedAt: null },
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      // Today's expenses
      prisma.expense.aggregate({
        where: { date: { gte: todayStart, lte: todayEnd }, deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    const alerts = await prisma.alert.findMany({
      where: { isRead: false, isDismissed: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      todaySales: {
        count: todaySales._count,
        total: Number(todaySales._sum.totalAmount || 0),
      },
      monthSales: {
        count: monthSales._count,
        total: Number(monthSales._sum.totalAmount || 0),
      },
      totalProducts,
      lowStockCount: Number(lowStockCount[0]?.count || 0),
      totalCustomers,
      pendingCredit: Number(pendingCredit._sum.creditBalance || 0),
      todayExpenses: Number(todayExpenses._sum.amount || 0),
      recentSales,
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        totalQty: Number(p._sum.quantity || 0),
        totalRevenue: Number(p._sum.total || 0),
      })),
      alerts,
    };
  }

  static async getSalesChart(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const dailySales = await prisma.$queryRaw<Array<{ date: Date; total: number; count: bigint }>>`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        COALESCE(SUM("totalAmount"), 0) as total,
        COUNT(*) as count
      FROM "Sale"
      WHERE "createdAt" >= ${startDate}
        AND "deletedAt" IS NULL
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
    `;

    return dailySales.map((d) => ({
      date: d.date,
      total: Number(d.total),
      count: Number(d.count),
    }));
  }

  static async getCategoryDistribution() {
    const distribution = await prisma.$queryRaw<Array<{ category: string; total: number }>>`
      SELECT 
        c.name as category,
        COALESCE(SUM(si.total), 0) as total
      FROM "SaleItem" si
      JOIN "Product" p ON si."productId" = p.id
      JOIN "Category" c ON p."categoryId" = c.id
      JOIN "Sale" s ON si."saleId" = s.id
      WHERE s."deletedAt" IS NULL
        AND s."createdAt" >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY c.name
      ORDER BY total DESC
    `;

    return distribution.map((d) => ({
      category: d.category,
      total: Number(d.total),
    }));
  }
}
