import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ──────────────────────────────────────────────

export interface CartItem {
  productId: string;
  productName: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  discount: number; // Per-item discount amount
  total: number;
  maxStock: number;
}

export interface CartPayment {
  method: 'CASH' | 'CARD' | 'MOBILE_BANKING' | 'CREDIT';
  amount: number;
  reference?: string;
}

interface CartState {
  // Cart Items
  items: CartItem[];
  
  // Customer
  customerId: string | null;
  customerName: string | null;
  customerCreditLimit: number;
  customerCreditBalance: number;

  // Discount
  discountType: 'percentage' | 'flat';
  discountValue: number;

  // VAT
  vatEnabled: boolean;
  vatRate: number;

  // Payments
  payments: CartPayment[];

  // Notes
  notes: string;

  // Computed (not stored, recalculated)
  // These are methods below

  // ─── Actions ────────────────────────────────────────
  addItem: (item: Omit<CartItem, 'total'>) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  updateItemDiscount: (productId: string, discount: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;

  setCustomer: (id: string | null, name: string | null, creditLimit?: number, creditBalance?: number) => void;
  setDiscount: (type: 'percentage' | 'flat', value: number) => void;
  setVat: (enabled: boolean, rate?: number) => void;
  setPayments: (payments: CartPayment[]) => void;
  addPayment: (payment: CartPayment) => void;
  removePayment: (index: number) => void;
  setNotes: (notes: string) => void;

  // ─── Computed Getters ───────────────────────────────
  getSubtotal: () => number;
  getItemDiscountTotal: () => number;
  getDiscountAmount: () => number;
  getTaxableAmount: () => number;
  getVatAmount: () => number;
  getTotalAmount: () => number;
  getPaidAmount: () => number;
  getCreditAmount: () => number;
  getChangeAmount: () => number;
  getItemCount: () => number;
}

// ─── Store ──────────────────────────────────────────────

const initialState = {
  items: [] as CartItem[],
  customerId: null as string | null,
  customerName: null as string | null,
  customerCreditLimit: 0,
  customerCreditBalance: 0,
  discountType: 'percentage' as const,
  discountValue: 0,
  vatEnabled: false,
  vatRate: 13,
  payments: [] as CartPayment[],
  notes: '',
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ─── Item Actions ─────────────────────────────────

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? {
                      ...i,
                      quantity: i.quantity + item.quantity,
                      total: (i.quantity + item.quantity) * i.unitPrice - i.discount,
                    }
                  : i
              ),
            };
          }
          const total = item.quantity * item.unitPrice - item.discount;
          return {
            items: [...state.items, { ...item, total }],
          };
        });
      },

      updateItemQuantity: (productId, quantity) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity, total: quantity * i.unitPrice - i.discount }
              : i
          ),
        }));
      },

      updateItemDiscount: (productId, discount) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, discount, total: i.quantity * i.unitPrice - discount }
              : i
          ),
        }));
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      clearCart: () => {
        set(initialState);
      },

      // ─── Customer Actions ─────────────────────────────

      setCustomer: (id, name, creditLimit = 0, creditBalance = 0) => {
        set({
          customerId: id,
          customerName: name,
          customerCreditLimit: creditLimit,
          customerCreditBalance: creditBalance,
        });
      },

      setDiscount: (type, value) => {
        set({ discountType: type, discountValue: value });
      },

      setVat: (enabled, rate) => {
        set({ vatEnabled: enabled, ...(rate !== undefined && { vatRate: rate }) });
      },

      setPayments: (payments) => {
        set({ payments });
      },

      addPayment: (payment) => {
        set((state) => ({ payments: [...state.payments, payment] }));
      },

      removePayment: (index) => {
        set((state) => ({
          payments: state.payments.filter((_, i) => i !== index),
        }));
      },

      setNotes: (notes) => {
        set({ notes });
      },

      // ─── Computed Getters ─────────────────────────────

      getSubtotal: () => {
        return get().items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      },

      getItemDiscountTotal: () => {
        return get().items.reduce((sum, i) => sum + i.discount, 0);
      },

      getDiscountAmount: () => {
        const subtotal = get().getSubtotal() - get().getItemDiscountTotal();
        const { discountType, discountValue } = get();
        if (discountType === 'percentage') {
          return Math.round(subtotal * (discountValue / 100) * 100) / 100;
        }
        return Math.min(discountValue, subtotal);
      },

      getTaxableAmount: () => {
        return get().getSubtotal() - get().getItemDiscountTotal() - get().getDiscountAmount();
      },

      getVatAmount: () => {
        if (!get().vatEnabled) return 0;
        return Math.round(get().getTaxableAmount() * (get().vatRate / 100) * 100) / 100;
      },

      getTotalAmount: () => {
        return Math.round((get().getTaxableAmount() + get().getVatAmount()) * 100) / 100;
      },

      getPaidAmount: () => {
        return get().payments
          .filter((p) => p.method !== 'CREDIT')
          .reduce((sum, p) => sum + p.amount, 0);
      },

      getCreditAmount: () => {
        return get().payments
          .filter((p) => p.method === 'CREDIT')
          .reduce((sum, p) => sum + p.amount, 0);
      },

      getChangeAmount: () => {
        const total = get().getTotalAmount();
        const paid = get().getPaidAmount();
        const credit = get().getCreditAmount();
        return Math.max(0, paid - (total - credit));
      },

      getItemCount: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },
    }),
    {
      name: 'supplytrack-cart',
      partialize: (state) => ({
        items: state.items,
        customerId: state.customerId,
        customerName: state.customerName,
        discountType: state.discountType,
        discountValue: state.discountValue,
        vatEnabled: state.vatEnabled,
        payments: state.payments,
        notes: state.notes,
      }),
    }
  )
);
