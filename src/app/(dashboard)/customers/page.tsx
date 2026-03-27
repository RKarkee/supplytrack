'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Space, Typography, message, Popconfirm, Card, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DollarOutlined } from '@ant-design/icons';
import { formatCurrency } from '@/lib/utils/currency';

const { Title, Text } = Typography;

interface Customer {
  id: string; name: string; phone: string | null; email: string | null;
  address: string | null; creditLimit: string; creditBalance: string; isActive: boolean;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentModal, setPaymentModal] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();

  const fetchCustomers = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?page=${page}&limit=20&search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) { setCustomers(data.data); setPagination((p) => ({ ...p, current: data.meta.page, total: data.meta.total })); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { const t = setTimeout(() => fetchCustomers(1, search), 400); return () => clearTimeout(t); }, [search, fetchCustomers]);

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      const url = editing ? `/api/customers/${editing.id}` : '/api/customers';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const data = await res.json();
      if (data.success) { message.success(editing ? 'Updated' : 'Created'); setModalOpen(false); setEditing(null); form.resetFields(); fetchCustomers(); }
      else message.error(data.error);
    } catch { message.error('Error'); }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (v: string | null) => v || '-' },
    { title: 'Credit Limit', dataIndex: 'creditLimit', key: 'creditLimit', render: (v: string) => formatCurrency(v) },
    { title: 'Balance', dataIndex: 'creditBalance', key: 'creditBalance', render: (v: string) => {
      const bal = parseFloat(v);
      return <Tag color={bal > 0 ? 'red' : 'green'}>{formatCurrency(v)}</Tag>;
    }},
    { title: 'Actions', key: 'actions', render: (_: unknown, r: Customer) => (
      <Space>
        {parseFloat(r.creditBalance) > 0 && <Button size="small" icon={<DollarOutlined />} onClick={() => { setPaymentModal(r); paymentForm.resetFields(); }}>Pay</Button>}
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue({ name: r.name, phone: r.phone, email: r.email, address: r.address, creditLimit: parseFloat(r.creditLimit) }); setModalOpen(true); }} />
        <Popconfirm title="Delete?" onConfirm={async () => { await fetch(`/api/customers/${r.id}`, { method: 'DELETE' }); fetchCustomers(); }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div><Title level={3} style={{ margin: 0 }}>Customers</Title><Text type="secondary">{pagination.total} customers</Text></div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}>Add Customer</Button>
      </div>
      <Card bordered={false} style={{ borderRadius: 16 }}>
        <Input placeholder="Search..." prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 16, maxWidth: 400 }} allowClear />
        <Table columns={columns} dataSource={customers} rowKey="id" loading={loading} pagination={{ current: pagination.current, total: pagination.total, pageSize: 20, onChange: (p) => fetchCustomers(p, search) }} size="middle" />
      </Card>
      <Modal title={editing ? 'Edit Customer' : 'Add Customer'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={480}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Phone"><Input /></Form.Item>
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="address" label="Address"><Input /></Form.Item>
          <Form.Item name="creditLimit" label="Credit Limit (Rs)" initialValue={0}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
      <Modal title={`Receive Payment - ${paymentModal?.name}`} open={!!paymentModal} onCancel={() => setPaymentModal(null)} onOk={() => paymentForm.submit()}>
        <Text>Outstanding: <Tag color="red">{formatCurrency(paymentModal?.creditBalance || '0')}</Tag></Text>
        <Form form={paymentForm} layout="vertical" style={{ marginTop: 16 }} onFinish={async (v) => {
          const res = await fetch(`/api/customers/${paymentModal?.id}/pay-credit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: v.amount }) });
          const data = await res.json();
          if (data.success) { message.success('Payment received'); setPaymentModal(null); fetchCustomers(); }
          else message.error(data.error);
        }}>
          <Form.Item name="amount" label="Payment Amount (Rs)" rules={[{ required: true }]}><InputNumber min={0.01} max={parseFloat(paymentModal?.creditBalance || '0')} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
