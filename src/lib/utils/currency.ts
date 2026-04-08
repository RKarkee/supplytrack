/**
 * Currency, number, and formatting utilities for Nepal Rupee system
 */

const CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_CURRENCY || 'Rs';

/**
 * Format a number as Nepal Rupee currency string
 * e.g. formatCurrency(1234.56) => "Rs 1,234.56"
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return `${CURRENCY_SYMBOL} 0.00`;
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${CURRENCY_SYMBOL} 0.00`;

  return `${CURRENCY_SYMBOL} ${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Parse currency string back to number
 */
export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
}

/**
 * Format a number with commas (Indian numbering system)
 */
export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '0';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return n.toLocaleString('en-IN');
}

/**
 * Format percentage
 */
export function formatPercent(value: number | string, decimals: number = 1): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '0%';
  return `${n.toFixed(decimals)}%`;
}

/**
 * Calculate VAT amount
 */
export function calculateVAT(amount: number, vatRate: number = 13): number {
  return roundCurrency(amount * (vatRate / 100));
}

/**
 * Calculate discount
 */
export function calculateDiscount(
  subtotal: number,
  discountType: 'percentage' | 'flat',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return roundCurrency(subtotal * (discountValue / 100));
  }
  return roundCurrency(Math.min(discountValue, subtotal));
}

/**
 * Round to 2 decimal places for currency
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Calculate margin percentage
 */
export function calculateMargin(sellingPrice: number, purchasePrice: number): number {
  if (sellingPrice === 0) return 0;
  return roundCurrency(((sellingPrice - purchasePrice) / sellingPrice) * 100);
}

/**
 * Generate invoice number with date prefix
 * Format: INV-YYYYMMDD-XXXX
 */
export function generateInvoiceNumber(sequence: number): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `INV-${dateStr}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Generate purchase order number
 * Format: PO-YYYYMMDD-XXXX
 */
export function generatePONumber(sequence: number): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `PO-${dateStr}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Generate return number
 */
export function generateReturnNumber(sequence: number): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `RET-${dateStr}-${String(sequence).padStart(4, '0')}`;
}
