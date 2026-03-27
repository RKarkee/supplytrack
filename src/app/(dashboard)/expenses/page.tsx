'use client';
import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, Space, Typography, message, Card, Tag } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { formatCurrency } from '@/lib/utils/currency';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();

  const fetchExpenses = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?page=${page}&limit=20&search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) { 
        setExpenses(data.data); 
        setPagination(p => ({ ...p, current: data.meta.page, total: data.meta.total })); 
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses/categories');
      const data = await res.json();
      if (data.success) setCategories(data.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { 
    const t = setTimeout(() => fetchExpenses(1, search), 400); 
    return () => clearTimeout(t); 
  }, [search, fetchExpenses]);

  const handleSaveExpense = async (values: any) => {
    try {
      const payload = { ...values, date: values.date?.toISOString() };
      const res = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { 
        message.success('Expense created'); 
        setModalOpen(false); 
        form.resetFields(); 
        fetchExpenses(); 
      } else message.error(data.error);
    } catch { message.error('Error creating expense'); }
  };

  const handleSaveCategory = async (values: any) => {
    try {
      const res = await fetch('/api/expenses/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const data = await res.json();
      if (data.success) { 
        message.success('Category created'); 
        setCategoryModalOpen(false); 
        categoryForm.resetFields(); 
        fetchCategories(); 
      } else message.error(data.error);
    } catch { message.error('Error creating category'); }
  };

  const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (c: any) => <Text>{c?.name || 'N/A'}</Text> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v: string) => <Tag color="red">{formatCurrency(v)}</Tag> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Expenses</Title>
        <Space>
          <Button onClick={() => setCategoryModalOpen(true)}>Manage Categories</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}>Add Expense</Button>
        </Space>
      </div>
      <Card bordered={false} style={{ borderRadius: 16 }}>
        <Input placeholder="Search description..." prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 16, maxWidth: 400 }} allowClear />
        <Table columns={columns} dataSource={expenses} rowKey="id" loading={loading} pagination={{ current: pagination.current, total: pagination.total, pageSize: 20, onChange: (p) => fetchExpenses(p, search) }} size="middle" />
      </Card>

      <Modal title="Add Expense" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={480}>
        <Form form={form} layout="vertical" onFinish={handleSaveExpense} initialValues={{ date: dayjs() }}>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
            <Select options={categories.map(c => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item name="amount" label="Amount (Rs)" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Add Category" open={categoryModalOpen} onCancel={() => setCategoryModalOpen(false)} onOk={() => categoryForm.submit()} width={400}>
        <Form form={categoryForm} layout="vertical" onFinish={handleSaveCategory}>
          <Form.Item name="name" label="Category Name" rules={[{ required: true }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
