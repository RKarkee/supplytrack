'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Space,
  Tag, Typography, message, Popconfirm, Card,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { formatCurrency } from '@/lib/utils/currency';

const { Title, Text } = Typography;

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  categoryId: string;
  unitId: string;
  purchasePrice: string;
  sellingPrice: string;
  currentStock: string;
  minStock: string;
  isActive: boolean;
  category: { id: string; name: string };
  unit: { id: string; name: string; abbreviation: string };
}

interface Category { id: string; name: string }
interface Unit { id: string; name: string; abbreviation: string }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [form] = Form.useForm();

  const fetchProducts = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/products?page=${page}&limit=${pagination.pageSize}&search=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
        setPagination((prev) => ({ ...prev, current: data.meta.page, total: data.meta.total }));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [pagination.pageSize]);

  useEffect(() => {
    fetchProducts();
    fetch('/api/categories').then((r) => r.json()).then((d) => d.success && setCategories(d.data));
    fetch('/api/units').then((r) => r.json()).then((d) => d.success && setUnits(d.data));
  }, [fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(1, search), 400);
    return () => clearTimeout(timer);
  }, [search, fetchProducts]);

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      const url = editing ? `/api/products/${editing.id}` : '/api/products';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.success) {
        message.success(editing ? 'Product updated' : 'Product created');
        setModalOpen(false);
        setEditing(null);
        form.resetFields();
        fetchProducts(pagination.current, search);
      } else {
        message.error(data.error || 'Failed to save');
      }
    } catch { message.error('Network error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success('Product deleted');
        fetchProducts(pagination.current, search);
      }
    } catch { message.error('Delete failed'); }
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    form.setFieldsValue({
      name: product.name,
      barcode: product.barcode,
      sku: product.sku,
      categoryId: product.categoryId,
      unitId: product.unitId,
      purchasePrice: parseFloat(product.purchasePrice),
      sellingPrice: parseFloat(product.sellingPrice),
      currentStock: parseFloat(product.currentStock),
      minStock: parseFloat(product.minStock),
    });
    setModalOpen(true);
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Category', key: 'category', render: (_: unknown, r: Product) => <Tag color="blue">{r.category.name}</Tag> },
    { title: 'Barcode', dataIndex: 'barcode', key: 'barcode', render: (v: string | null) => v || '-' },
    { title: 'Purchase', dataIndex: 'purchasePrice', key: 'purchasePrice', render: (v: string) => formatCurrency(v) },
    { title: 'Selling', dataIndex: 'sellingPrice', key: 'sellingPrice', render: (v: string) => <Text strong style={{ color: '#52c41a' }}>{formatCurrency(v)}</Text> },
    {
      title: 'Stock', key: 'stock',
      render: (_: unknown, r: Product) => {
        const stock = parseFloat(r.currentStock);
        const min = parseFloat(r.minStock);
        return (
          <Tag color={stock <= 0 ? 'red' : stock <= min ? 'orange' : 'green'}>
            {stock} {r.unit.abbreviation}
          </Tag>
        );
      },
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, r: Product) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Delete this product?" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Products</Title>
          <Text type="secondary">{pagination.total} products in inventory</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
          style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}
        >
          Add Product
        </Button>
      </div>

      <Card variant="borderless" style={{ borderRadius: 16 }}>
        <Input
          placeholder="Search products..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 16, maxWidth: 400 }}
          allowClear
        />
        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: false,
            onChange: (page) => fetchProducts(page, search),
          }}
          size="middle"
        />
      </Card>

      <Modal
        title={editing ? 'Edit Product' : 'Add Product'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
            <Input placeholder="Enter product name" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="barcode" label="Barcode">
              <Input placeholder="Scan or enter barcode" />
            </Form.Item>
            <Form.Item name="sku" label="SKU">
              <Input placeholder="Stock keeping unit" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
              <Select
                placeholder="Select category"
                options={categories.map((c) => ({ label: c.name, value: c.id }))}
              />
            </Form.Item>
            <Form.Item name="unitId" label="Unit" rules={[{ required: true }]}>
              <Select
                placeholder="Select unit"
                options={units.map((u) => ({ label: `${u.name} (${u.abbreviation})`, value: u.id }))}
              />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="purchasePrice" label="Purchase Price (Rs)" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
            <Form.Item name="sellingPrice" label="Selling Price (Rs)" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="currentStock" label="Current Stock" initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="minStock" label="Min Stock (Alert)" initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
