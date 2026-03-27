import { prisma } from '@/lib/db/prisma';
import { withAuth, withErrorHandler, successResponse } from '@/lib/api';
import dayjs from 'dayjs';

export const GET = withErrorHandler(
  withAuth(async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sales';
    const startDate = searchParams.get('startDate') ? dayjs(searchParams.get('startDate')).toDate() : dayjs().subtract(30, 'day').toDate();
    const endDate = searchParams.get('endDate') ? dayjs(searchParams.get('endDate')).endOf('day').toDate() : new Date();

    if (type === 'sales') {
      const sales = await prisma.sale.findMany({
        where: { createdAt: { gte: startDate, lte: endDate }, deletedAt: null },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'asc' },
      });

      // Group by day
      const dailySales: Record<string, any> = {};
      let totalRevenue = 0;
      let totalProfit = 0;

      sales.forEach((s) => {
        const dateKey = dayjs(s.createdAt).format('YYYY-MM-DD');
        if (!dailySales[dateKey]) {
          dailySales[dateKey] = { date: dateKey, total: 0, profit: 0, saleCount: 0 };
        }
        
        let saleCost = 0;
        s.items.forEach(item => {
          saleCost += Number(item.quantity) * Number(item.product.purchasePrice);
        });

        const saleRevenue = Number(s.totalAmount) - Number(s.vatAmount);
        const saleProfit = saleRevenue - saleCost;

        dailySales[dateKey].total += Number(s.totalAmount);
        dailySales[dateKey].profit += saleProfit;
        dailySales[dateKey].saleCount += 1;

        totalRevenue += Number(s.totalAmount);
        totalProfit += saleProfit;
      });

      return successResponse({
        timeline: Object.values(dailySales),
        summary: { totalRevenue, totalProfit, totalSales: sales.length },
      });
    }

    if (type === 'stock') {
      const products = await prisma.product.findMany({
        where: { deletedAt: null },
        include: { category: true }
      });
      
      const stockValuation = products.reduce((sum, p) => sum + (Number(p.currentStock) * Number(p.purchasePrice)), 0);
      const retailValuation = products.reduce((sum, p) => sum + (Number(p.currentStock) * Number(p.sellingPrice)), 0);

      return successResponse({
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category.name,
          stock: p.currentStock,
          purchasePrice: p.purchasePrice,
          sellingPrice: p.sellingPrice,
          totalValue: Number(p.currentStock) * Number(p.purchasePrice),
        })),
        summary: { stockValuation, retailValuation, itemTypesCount: products.length }
      });
    }

    if (type === 'credit') {
      const customers = await prisma.customer.findMany({
        where: { deletedAt: null, creditBalance: { gt: 0 } },
        orderBy: { creditBalance: 'desc' }
      });

      const totalCreditOutstanding = customers.reduce((sum, c) => sum + Number(c.creditBalance), 0);

      return successResponse({
        customers,
        summary: { totalCreditOutstanding, customerCount: customers.length }
      });
    }

    return successResponse({ error: 'Invalid report type' });
  })
);
