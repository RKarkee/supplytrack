'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Input, Button, InputNumber, Select, Switch, Divider, Empty, message,
  Modal, Typography, Tag, Space,
} from 'antd';
import type { InputRef } from 'antd';
import {
  SearchOutlined, DeleteOutlined, ClearOutlined, ShoppingCartOutlined,
  BarcodeOutlined, UserOutlined, CreditCardOutlined,
  DollarOutlined, MobileOutlined,
} from '@ant-design/icons';
import { useCartStore } from '@/stores';
import { formatCurrency } from '@/lib/utils/currency';
import dynamic from 'next/dynamic';

const BarcodeScanner = dynamic(
  () => import('@/components/common/BarcodeScanner').then(mod => mod.BarcodeScanner),
  { ssr: false }
);

const { Text, Title } = Typography;

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  sellingPrice: string;
  currentStock: string;
  unit: { abbreviation: string };
  category: { name: string };
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  creditLimit: string;
  creditBalance: string;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const searchRef = useRef<InputRef>(null);

  const cart = useCartStore();

  // Search products with debounce
  const searchProducts = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setProducts([]);
      return;
    }
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}&limit=20`);
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (err) {
      console.error('Search error:', err);
    }
  }, []);

  // Barcode lookup
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    try {
      const res = await fetch(`/api/products/barcode?code=${encodeURIComponent(barcode)}`);
      const data = await res.json();
      if (data.success && data.data) {
        const p = data.data;
        cart.addItem({
          productId: p.id,
          productName: p.name,
          barcode: p.barcode,
          quantity: 1,
          unitPrice: parseFloat(p.sellingPrice),
          discount: 0,
          maxStock: parseFloat(p.currentStock),
        });
        message.success(`Added: ${p.name}`);
        setSearchQuery('');
      } else {
        message.warning('Product not found for this barcode');
      }
    } catch {
      message.error('Barcode lookup failed');
    }
  }, [cart]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if it looks like a barcode (all digits, 8+ chars)
      if (/^\d{8,}$/.test(searchQuery)) {
        handleBarcodeScan(searchQuery);
      } else {
        searchProducts(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProducts, handleBarcodeScan]);

  // Customer search
  useEffect(() => {
    if (customerSearch.length < 2) {
      setCustomers([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}&limit=5`);
        const data = await res.json();
        if (data.success) setCustomers(data.data);
      } catch (err) {
        console.error('Customer search error:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const addToCart = (product: Product) => {
    const stock = parseFloat(product.currentStock);
    if (stock <= 0) {
      message.warning('Out of stock');
      return;
    }
    cart.addItem({
      productId: product.id,
      productName: product.name,
      barcode: product.barcode ?? undefined,
      quantity: 1,
      unitPrice: parseFloat(product.sellingPrice),
      discount: 0,
      maxStock: stock,
    });
  };

  const handleCompleteSale = async () => {
    if (cart.items.length === 0) return;

    // Validate payments
    const total = cart.getTotalAmount();
    const paidAmount = cart.getPaidAmount();
    const creditAmount = cart.getCreditAmount();

    if (paidAmount + creditAmount < total) {
      message.error('Payment amount is less than total');
      return;
    }

    if (creditAmount > 0 && !cart.customerId) {
      message.error('Customer is required for credit sales');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: cart.customerId || undefined,
          items: cart.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
          })),
          payments: cart.payments,
          discountType: cart.discountType,
          discountValue: cart.discountValue,
          vatEnabled: cart.vatEnabled,
          notes: cart.notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        message.success(`Sale completed! Invoice: ${data.data.invoiceNumber}`);
        // Generate and open PDF receipt
        const { generateReceipt } = await import('@/lib/utils/pdf');
        generateReceipt(data.data);
        
        cart.clearCart();
        setShowPayment(false);
        setSearchQuery('');
        setProducts([]);
      } else {
        message.error(data.error || 'Sale failed');
      }
    } catch {
      message.error('Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const subtotal = cart.getSubtotal();
  const itemDiscountTotal = cart.getItemDiscountTotal();
  const discountAmount = cart.getDiscountAmount();
  const vatAmount = cart.getVatAmount();
  const totalAmount = cart.getTotalAmount();

  return (
    <div className="pos-layout">
      {/* Products Panel */}
      <div className="pos-products">
        <div className="pos-search" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input
            ref={searchRef}
            size="large"
            placeholder="Search products or type barcode..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            allowClear
            style={{ flex: 1 }}
          />
          <Button 
            type="primary" 
            size="large" 
            icon={<BarcodeOutlined />} 
            onClick={() => setShowScanner(true)}
            style={{ minWidth: 100 }}
          >
            Scan
          </Button>
        </div>

        <div className="pos-product-grid">
          {products.length === 0 && !searchQuery && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60 }}>
              <Empty
                description={
                  <div>
                    <Text strong style={{ fontSize: 16 }}>Search or scan products</Text>
                    <br />
                    <Text type="secondary">Type a product name or scan a barcode to get started</Text>
                  </div>
                }
              />
            </div>
          )}
          {products.map((product) => (
            <div
              key={product.id}
              className="pos-product-card"
              onClick={() => addToCart(product)}
            >
              <div className="name">{product.name}</div>
              <div className="price">{formatCurrency(product.sellingPrice)}</div>
              <div className="stock">
                Stock: {parseFloat(product.currentStock)} {product.unit.abbreviation}
              </div>
              <Tag color="blue" style={{ marginTop: 4, fontSize: 10 }}>
                {product.category.name}
              </Tag>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="pos-cart">
        <div className="cart-header">
          <Title level={5} style={{ margin: 0 }}>
            <ShoppingCartOutlined style={{ marginRight: 8 }} />
            Cart ({cart.items.length})
          </Title>
          <Button
            type="text"
            danger
            icon={<ClearOutlined />}
            onClick={() => cart.clearCart()}
            disabled={cart.items.length === 0}
          >
            Clear
          </Button>
        </div>

        {/* Customer Selection */}
        <div style={{ padding: '8px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <Input
            size="small"
            placeholder="Search customer..."
            prefix={<UserOutlined />}
            value={cart.customerName || customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              if (!e.target.value) cart.setCustomer(null, null);
            }}
            allowClear
          />
          {customers.length > 0 && (
            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, marginTop: 4, maxHeight: 120, overflowY: 'auto' }}>
              {customers.map((c) => (
                <div
                  key={c.id}
                  style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}
                  className="pos-product-card"
                  onClick={() => {
                    cart.setCustomer(c.id, c.name, parseFloat(c.creditLimit), parseFloat(c.creditBalance));
                    setCustomerSearch('');
                    setCustomers([]);
                  }}
                >
                  <strong>{c.name}</strong> {c.phone && `(${c.phone})`}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="cart-items">
          {cart.items.length === 0 ? (
            <Empty description="No items in cart" style={{ padding: 40 }} />
          ) : (
            cart.items.map((item) => (
              <div key={item.productId} className="cart-item">
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 13 }}>{item.productName}</Text>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <InputNumber
                      size="small"
                      min={0.001}
                      max={item.maxStock}
                      value={item.quantity}
                      onChange={(v) => v && cart.updateItemQuantity(item.productId, v)}
                      style={{ width: 70 }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      × {formatCurrency(item.unitPrice)}
                    </Text>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text strong>{formatCurrency(item.total)}</Text>
                  <br />
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => cart.removeItem(item.productId)}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary */}
        <div className="cart-summary">
          {/* Discount & VAT controls */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <Select
              size="small"
              value={cart.discountType}
              onChange={(v) => cart.setDiscount(v, cart.discountValue)}
              style={{ width: 90 }}
              options={[
                { label: '%', value: 'percentage' },
                { label: 'Rs', value: 'flat' },
              ]}
            />
            <InputNumber
              size="small"
              min={0}
              placeholder="Discount"
              value={cart.discountValue}
              onChange={(v) => cart.setDiscount(cart.discountType, v || 0)}
              style={{ width: 80 }}
            />
            <Divider type="vertical" />
            <Switch
              size="small"
              checked={cart.vatEnabled}
              onChange={(v) => cart.setVat(v)}
            />
            <Text style={{ fontSize: 12 }}>VAT 13%</Text>
          </div>

          <div className="cart-summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {itemDiscountTotal > 0 && (
            <div className="cart-summary-row">
              <span>Item Discounts</span>
              <span style={{ color: '#ff4d4f' }}>-{formatCurrency(itemDiscountTotal)}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="cart-summary-row">
              <span>Bill Discount</span>
              <span style={{ color: '#ff4d4f' }}>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {vatAmount > 0 && (
            <div className="cart-summary-row">
              <span>VAT (13%)</span>
              <span>{formatCurrency(vatAmount)}</span>
            </div>
          )}
          <div className="cart-summary-row total">
            <span>Total</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>

          <Button
            type="primary"
            size="large"
            block
            disabled={cart.items.length === 0}
            onClick={() => {
              // Auto-set CASH payment for total
              if (cart.payments.length === 0) {
                cart.setPayments([{ method: 'CASH', amount: totalAmount }]);
              }
              setShowPayment(true);
            }}
            style={{
              marginTop: 16,
              height: 48,
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 16,
              background: cart.items.length > 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined,
              border: 'none',
            }}
          >
            <DollarOutlined /> Charge {formatCurrency(totalAmount)}
          </Button>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        title="Complete Payment"
        open={showPayment}
        onCancel={() => setShowPayment(false)}
        footer={null}
        width={480}
      >
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ textAlign: 'center', margin: '16px 0' }}>
            {formatCurrency(totalAmount)}
          </Title>
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {cart.payments.map((payment, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Select
                value={payment.method}
                onChange={(method) => {
                  const newPayments = [...cart.payments];
                  newPayments[index] = { ...payment, method };
                  cart.setPayments(newPayments);
                }}
                style={{ width: 160 }}
                options={[
                  { label: '💵 Cash', value: 'CASH' },
                  { label: '💳 Card', value: 'CARD' },
                  { label: '📱 Mobile Banking', value: 'MOBILE_BANKING' },
                  { label: '📝 Credit', value: 'CREDIT' },
                ]}
              />
              <InputNumber
                value={payment.amount}
                onChange={(v) => {
                  const newPayments = [...cart.payments];
                  newPayments[index] = { ...payment, amount: v || 0 };
                  cart.setPayments(newPayments);
                }}
                style={{ flex: 1 }}
                min={0}
                prefix="Rs"
              />
              {cart.payments.length > 1 && (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => cart.removePayment(index)}
                />
              )}
            </div>
          ))}

          <Button
            type="dashed"
            block
            onClick={() => cart.addPayment({ method: 'CASH', amount: 0 })}
          >
            + Split Payment
          </Button>

          {cart.getCreditAmount() > 0 && cart.customerId && (
            <Tag color="orange" style={{ padding: '4px 12px' }}>
              <CreditCardOutlined /> Credit: {formatCurrency(cart.getCreditAmount())} 
              (Limit: {formatCurrency(cart.customerCreditLimit)})
            </Tag>
          )}

          {cart.getChangeAmount() > 0 && (
            <Tag color="green" style={{ padding: '4px 12px', fontSize: 14 }}>
              <MobileOutlined /> Change: {formatCurrency(cart.getChangeAmount())}
            </Tag>
          )}

          <Button
            type="primary"
            size="large"
            block
            loading={processing}
            onClick={handleCompleteSale}
            style={{
              height: 48,
              borderRadius: 12,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
              border: 'none',
            }}
          >
            Complete Sale
          </Button>
        </Space>
      </Modal>

      {/* Barcode Scanner Modal */}
      <Modal
        title="Scan Barcode"
        open={showScanner}
        onCancel={() => setShowScanner(false)}
        footer={null}
        destroyOnClose
      >
        <BarcodeScanner 
          onScan={(text) => {
            handleBarcodeScan(text);
            setShowScanner(false);
          }} 
        />
      </Modal>
    </div>
  );
}
