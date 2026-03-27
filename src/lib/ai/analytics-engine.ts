/**
 * AI Analytics Engine
 * Smart Inventory Intelligence with statistical forecasting
 * 
 * Algorithms:
 * - Weighted Moving Average + Trend Adjustment for demand forecasting
 * - Linear Regression for sales trend detection
 * - Smart reorder level and safety stock calculations
 * - Dead stock detection
 * - Profit margin analysis
 * - Sales heatmap generation
 */

import { prisma } from '@/lib/db/prisma';
import { SaleTrend } from '@/generated/prisma';

// ─── Types ──────────────────────────────────────────────

interface MonthlyData {
  month: Date;
  totalQty: number;
  totalRevenue: number;
}

interface ProductForecast {
  productId: string;
  forecastQty: number;
  trend: SaleTrend;
  trendSlope: number;
  reorderLevel: number;
  safetyStock: number;
  recommendedPurchaseQty: number;
  dailyDemand: number;
  marginPercent: number;
  isDeadStock: boolean;
  lastSaleDate: Date | null;
}

interface HeatmapEntry {
  dayOfWeek: number;
  hourOfDay: number;
  totalSales: number;
  saleCount: number;
}

// ─── Weighted Moving Average Forecast ───────────────────

function weightedMovingAverage(m1: number, m2: number, m3: number): number {
  // m1 = most recent, m2 = previous, m3 = earliest
  return 0.5 * m1 + 0.3 * m2 + 0.2 * m3;
}

function trendAdjustment(m1: number, m3: number): number {
  return (m1 - m3) / 2;
}

export function calculateForecast(m1: number, m2: number, m3: number): number {
  const wma = weightedMovingAverage(m1, m2, m3);
  const trend = trendAdjustment(m1, m3);
  return Math.max(0, Math.round((wma + trend) * 100) / 100);
}

// ─── Linear Regression for Trend Detection ──────────────

interface DataPoint {
  x: number;
  y: number;
}

function linearRegression(points: DataPoint[]): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  const ssTotal = points.reduce((s, p) => s + (p.y - yMean) ** 2, 0);
  const ssResidual = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

  return { slope, intercept, r2 };
}

export function detectTrend(monthlySales: number[]): { trend: SaleTrend; slope: number } {
  if (monthlySales.length < 2) return { trend: 'STABLE', slope: 0 };

  const points: DataPoint[] = monthlySales.map((y, i) => ({ x: i, y }));
  const { slope } = linearRegression(points);

  // Threshold: slope > 5% of average means trending
  const avg = monthlySales.reduce((s, v) => s + v, 0) / monthlySales.length;
  const threshold = avg * 0.05;

  if (slope > threshold) return { trend: 'INCREASING', slope };
  if (slope < -threshold) return { trend: 'DECREASING', slope };
  return { trend: 'STABLE', slope };
}

// ─── Smart Reorder Calculations ─────────────────────────

export function calculateReorderLevel(dailyDemand: number, leadTimeDays: number): number {
  return Math.round(dailyDemand * leadTimeDays * 100) / 100;
}

export function calculateSafetyStock(dailyDemand: number, safetyDays: number): number {
  return Math.round(dailyDemand * safetyDays * 100) / 100;
}

export function calculateRecommendedPurchaseQty(
  forecastQty: number,
  safetyStock: number,
  currentStock: number
): number {
  return Math.max(0, Math.round((forecastQty + safetyStock - currentStock) * 100) / 100);
}

// ─── Margin Analysis ────────────────────────────────────

export function calculateMarginPercent(sellingPrice: number, purchasePrice: number): number {
  if (sellingPrice === 0) return 0;
  return Math.round(((sellingPrice - purchasePrice) / sellingPrice) * 10000) / 100;
}

// ─── Main Analytics Engine ──────────────────────────────

export async function runAnalytics(): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  try {
    // Get shop settings for safety stock days
    const settings = await prisma.shopSettings.findFirst();
    const safetyDays = settings?.safetyStockDays ?? 7;

    // Get all active products
    const products = await prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
    });

    // Get the current month start for forecast targeting
    const now = new Date();
    const forecastMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    for (const product of products) {
      try {
        // Get last 6 months of sales data
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        
        const monthlySales = await prisma.$queryRaw<MonthlyData[]>`
          SELECT 
            DATE_TRUNC('month', s."createdAt") as month,
            COALESCE(SUM(si.quantity), 0) as "totalQty",
            COALESCE(SUM(si.total), 0) as "totalRevenue"
          FROM "SaleItem" si
          JOIN "Sale" s ON si."saleId" = s.id
          WHERE si."productId" = ${product.id}
            AND s."createdAt" >= ${sixMonthsAgo}
            AND s."deletedAt" IS NULL
          GROUP BY DATE_TRUNC('month', s."createdAt")
          ORDER BY month DESC
        `;

        // Map monthly quantities (most recent 3 months)
        const monthlyQtys = monthlySales.map((m) => Number(m.totalQty));
        // Pad with zeros if less than 3 months
        while (monthlyQtys.length < 3) monthlyQtys.push(0);

        const m1 = monthlyQtys[0] || 0; // Most recent
        const m2 = monthlyQtys[1] || 0;
        const m3 = monthlyQtys[2] || 0;

        // Forecast
        const forecastQty = calculateForecast(m1, m2, m3);
        const dailyDemand = forecastQty / 30;

        // Trend detection
        const { trend, slope } = detectTrend(monthlyQtys.slice(0, 6).reverse());

        // Reorder calculations
        const leadDays = product.supplierLeadDays || 3;
        const reorderLevel = calculateReorderLevel(dailyDemand, leadDays);
        const safetyStock = calculateSafetyStock(dailyDemand, safetyDays);
        const currentStock = Number(product.currentStock);
        const recommendedPurchaseQty = calculateRecommendedPurchaseQty(forecastQty, safetyStock, currentStock);

        // Margin
        const marginPercent = calculateMarginPercent(
          Number(product.sellingPrice),
          Number(product.purchasePrice)
        );

        // Dead stock check: stock > 0 and no sales in last 90 days
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const lastSale = await prisma.saleItem.findFirst({
          where: { productId: product.id },
          include: { sale: true },
          orderBy: { sale: { createdAt: 'desc' } },
        });
        const lastSaleDate = lastSale?.sale?.createdAt || null;
        const isDeadStock = currentStock > 0 && (!lastSaleDate || lastSaleDate < ninetyDaysAgo);

        // Upsert forecast
        await prisma.demandForecast.upsert({
          where: {
            productId_forecastMonth: {
              productId: product.id,
              forecastMonth,
            },
          },
          update: {
            forecastQty,
            trend,
            trendSlope: slope,
            reorderLevel,
            safetyStock,
            recommendedPurchaseQty,
            dailyDemand,
            marginPercent,
            isDeadStock,
            lastSaleDate,
            computedAt: new Date(),
          },
          create: {
            productId: product.id,
            forecastMonth,
            forecastQty,
            trend,
            trendSlope: slope,
            reorderLevel,
            safetyStock,
            recommendedPurchaseQty,
            dailyDemand,
            marginPercent,
            isDeadStock,
            lastSaleDate,
          },
        });

        // Update product reorder level
        await prisma.product.update({
          where: { id: product.id },
          data: { reorderLevel },
        });

        processed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Product ${product.name}: ${msg}`);
      }
    }

    // Generate sales heatmap
    await generateSalesHeatmap(now);

    // Generate alerts
    await generateAlerts();

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    errors.push(`Analytics engine error: ${msg}`);
  }

  return { processed, errors };
}

// ─── Sales Heatmap Generation ───────────────────────────

async function generateSalesHeatmap(now: Date): Promise<void> {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const period = new Date(now.getFullYear(), now.getMonth(), 1);

  const heatmapData = await prisma.$queryRaw<HeatmapEntry[]>`
    SELECT 
      EXTRACT(DOW FROM s."createdAt") as "dayOfWeek",
      EXTRACT(HOUR FROM s."createdAt") as "hourOfDay",
      COALESCE(SUM(s."totalAmount"), 0) as "totalSales",
      COUNT(s.id)::int as "saleCount"
    FROM "Sale" s
    WHERE s."createdAt" >= ${thirtyDaysAgo}
      AND s."deletedAt" IS NULL
    GROUP BY EXTRACT(DOW FROM s."createdAt"), EXTRACT(HOUR FROM s."createdAt")
  `;

  for (const entry of heatmapData) {
    await prisma.salesHeatmap.upsert({
      where: {
        dayOfWeek_hourOfDay_period: {
          dayOfWeek: Number(entry.dayOfWeek),
          hourOfDay: Number(entry.hourOfDay),
          period,
        },
      },
      update: {
        totalSales: Number(entry.totalSales),
        saleCount: Number(entry.saleCount),
        computedAt: new Date(),
      },
      create: {
        dayOfWeek: Number(entry.dayOfWeek),
        hourOfDay: Number(entry.hourOfDay),
        totalSales: Number(entry.totalSales),
        saleCount: Number(entry.saleCount),
        period,
      },
    });
  }
}

// ─── Alert Generation ───────────────────────────────────

async function generateAlerts(): Promise<void> {
  // Low stock alerts
  const lowStockProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      currentStock: { lte: prisma.product.fields.minStock },
    },
  });

  for (const product of lowStockProducts) {
    const currentStock = Number(product.currentStock);
    const severity = currentStock === 0 ? 'CRITICAL' : currentStock <= Number(product.minStock) / 2 ? 'HIGH' : 'MEDIUM';
    const type = currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK';

    await prisma.alert.create({
      data: {
        type,
        severity,
        title: currentStock === 0 ? `Out of stock: ${product.name}` : `Low stock: ${product.name}`,
        message: `Current stock: ${currentStock}. Minimum stock: ${product.minStock}`,
        productId: product.id,
      },
    });
  }

  // Overdue credit alerts
  const overdueCustomers = await prisma.customer.findMany({
    where: {
      creditBalance: { gt: 0 },
      isActive: true,
    },
  });

  for (const customer of overdueCustomers) {
    // Check if there's a credit sale older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldCreditSale = await prisma.sale.findFirst({
      where: {
        customerId: customer.id,
        paymentStatus: { in: ['PARTIAL', 'UNPAID'] },
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    if (oldCreditSale) {
      await prisma.alert.create({
        data: {
          type: 'OVERDUE_CREDIT',
          severity: 'HIGH',
          title: `Overdue credit: ${customer.name}`,
          message: `Outstanding balance: Rs ${customer.creditBalance}. Has unpaid invoices older than 30 days.`,
          customerId: customer.id,
        },
      });
    }
  }
}

// ─── Get Analytics Summary ──────────────────────────────

export async function getAnalyticsSummary() {
  const forecasts = await prisma.demandForecast.findMany({
    include: { product: true },
    orderBy: { computedAt: 'desc' },
  });

  // Deduplicate: latest per product
  const latestByProduct = new Map<string, typeof forecasts[0]>();
  for (const f of forecasts) {
    if (!latestByProduct.has(f.productId)) {
      latestByProduct.set(f.productId, f);
    }
  }

  const latest = Array.from(latestByProduct.values());

  return {
    totalProducts: latest.length,
    deadStock: latest.filter((f) => f.isDeadStock),
    increasing: latest.filter((f) => f.trend === 'INCREASING'),
    decreasing: latest.filter((f) => f.trend === 'DECREASING'),
    stable: latest.filter((f) => f.trend === 'STABLE'),
    highMargin: latest.filter((f) => Number(f.marginPercent) >= 30),
    lowMargin: latest.filter((f) => Number(f.marginPercent) > 0 && Number(f.marginPercent) < 10),
    lossItems: latest.filter((f) => Number(f.marginPercent) <= 0),
    needReorder: latest.filter((f) => Number(f.recommendedPurchaseQty) > 0),
  };
}

export async function getSalesHeatmapData() {
  return prisma.salesHeatmap.findMany({
    orderBy: [{ dayOfWeek: 'asc' }, { hourOfDay: 'asc' }],
  });
}
