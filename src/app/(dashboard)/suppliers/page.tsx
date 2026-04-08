'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Space, Typography, message, Popconfirm, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface Supplier {
  id: string; name: string; phone: string | null; email: string | null;
  address: string | null; contactPerson: string | null; leadTimeDays: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [form] = Form.useForm();

  const fetchSuppliers = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers?page=${page}&limit=20&search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) { setSuppliers(data.data); setPagination((p) => ({ ...p, current: data.meta.page, total: data.meta.total })); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);
  useEffect(() => { const t = setTimeout(() => fetchSuppliers(1, search), 400); return () => clearTimeout(t); }, [search, fetchSuppliers]);

  const handleSave = async (values: Record<string, unknown>) => {
    try {
      const url = editing ? `/api/suppliers/${editing.id}` : '/api/suppliers';
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const data = await res.json();
      if (data.success) { message.success(editing ? 'Updated' : 'Created'); setModalOpen(false); setEditing(null); form.resetFields(); fetchSuppliers(); }
      else message.error(data.error);
    } catch { message.error('Error'); }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Contact Person', dataIndex: 'contactPerson', key: 'contactPerson', render: (v: string | null) => v || '-' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (v: string | null) => v || '-' },
    { title: 'Lead Time', dataIndex: 'leadTimeDays', key: 'leadTimeDays', render: (v: number) => `${v} days` },
    { title: 'Actions', key: 'actions', render: (_: unknown, r: Supplier) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); }} />
        <Popconfirm title="Delete?" onConfirm={async () => { await fetch(`/api/suppliers/${r.id}`, { method: 'DELETE' }); fetchSuppliers(); }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div><Title level={3} style={{ margin: 0 }}>Suppliers</Title><Text type="secondary">{pagination.total} suppliers</Text></div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}>Add Supplier</Button>
      </div>
      <Card variant="borderless" style={{ borderRadius: 16 }}>
        <Input placeholder="Search..." prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 16, maxWidth: 400 }} allowClear />
        <Table columns={columns} dataSource={suppliers} rowKey="id" loading={loading} pagination={{ current: pagination.current, total: pagination.total, pageSize: 20, onChange: (p) => fetchSuppliers(p, search) }} size="middle" />
      </Card>
      <Modal title={editing ? 'Edit Supplier' : 'Add Supplier'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={480}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="contactPerson" label="Contact Person"><Input /></Form.Item>
          <Form.Item name="phone" label="Phone"><Input /></Form.Item>
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="address" label="Address"><Input /></Form.Item>
          <Form.Item name="leadTimeDays" label="Lead Time (Days)" initialValue={3}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
