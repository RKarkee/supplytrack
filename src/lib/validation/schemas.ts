import { z } from 'zod';

// ─── Product Schemas ────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  unitId: z.string().min(1, 'Unit is required'),
  purchasePrice: z.number().min(0, 'Purchase price must be positive'),
  sellingPrice: z.number().min(0, 'Selling price must be positive'),
  mrp: z.number().min(0).optional(),
  currentStock: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  maxStock: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  imageUrl: z.string().url().optional(),
  expiryDate: z.string().datetime().optional(),
  supplierLeadDays: z.number().int().min(0).default(3),
});

export const updateProductSchema = createProductSchema.partial();

// ─── Category Schemas ───────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ─── Unit Schemas ───────────────────────────────────────

export const createUnitSchema = z.object({
  name: z.string().min(1, 'Unit name is required').max(50),
  abbreviation: z.string().min(1, 'Abbreviation is required').max(10),
});

// ─── Customer Schemas ───────────────────────────────────

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  creditLimit: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ─── Supplier Schemas ───────────────────────────────────

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  panNumber: z.string().optional(),
  leadTimeDays: z.number().int().min(0).default(3),
  notes: z.string().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

// ─── Sale / POS Schemas ────────────────────────────────

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().min(0.001, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
});

export const paymentSchema = z.object({
  method: z.enum(['CASH', 'CARD', 'MOBILE_BANKING', 'CREDIT']),
  amount: z.number().min(0),
  reference: z.string().optional(),
});

export const createSaleSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  payments: z.array(paymentSchema).min(1, 'At least one payment method is required'),
  discountType: z.enum(['percentage', 'flat']).optional(),
  discountValue: z.number().min(0).default(0),
  vatEnabled: z.boolean().default(false),
  notes: z.string().optional(),
  isOfflineSale: z.boolean().default(false),
});

// ─── Purchase Order Schemas ─────────────────────────────

export const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().min(0.001),
  unitPrice: z.number().min(0),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
  expectedDate: z.string().datetime().optional(),
  taxAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const receivePurchaseSchema = z.object({
  items: z.array(
    z.object({
      purchaseItemId: z.string().min(1),
      receivedQty: z.number().min(0),
    })
  ),
});

// ─── Expense Schemas ────────────────────────────────────

export const createExpenseSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().datetime().optional(),
  receiptUrl: z.string().url().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

// ─── Expense Category Schemas ───────────────────────────

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
});

// ─── Return Schemas ─────────────────────────────────────

export const returnItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().min(0.001),
  unitPrice: z.number().min(0),
});

export const createReturnSchema = z.object({
  saleId: z.string().min(1, 'Sale reference is required'),
  customerId: z.string().optional(),
  type: z.enum(['REFUND', 'EXCHANGE']),
  items: z.array(returnItemSchema).min(1, 'At least one item is required'),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Settings Schemas ───────────────────────────────────

export const updateSettingsSchema = z.object({
  shopName: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  panNumber: z.string().optional(),
  vatEnabled: z.boolean().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
  defaultCreditLimit: z.number().min(0).optional(),
  safetyStockDays: z.number().int().min(0).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

// ─── Auth Schemas ───────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Type exports ───────────────────────────────────────

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateReturnInput = z.infer<typeof createReturnSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
