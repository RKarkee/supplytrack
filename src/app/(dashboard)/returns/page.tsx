'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, Typography, message, Card, Tag } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { formatCurrency } from '@/lib/utils/currency';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [sales, setSales] = useState<{id: string, invoiceNumber: string, customerId?: string, customer?: any, items: any[]}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [selectedSale, setSelectedSale] = useState<any>(null);
  
  const [form] = Form.useForm();

  const fetchReturns = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/returns?page=${page}&limit=20&search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) { 
        setReturns(data.data); 
        setPagination(p => ({ ...p, current: data.meta.page, total: data.meta.total })); 
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchSales = async (q = '') => {
    try {
      const res = await fetch(`/api/sales?limit=50&search=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) setSales(data.data);
    } catch {}
  };

  useEffect(() => { fetchReturns(); fetchSales(); }, [fetchReturns]);
  useEffect(() => { const t = setTimeout(() => fetchReturns(1, search), 400); return () => clearTimeout(t); }, [search, fetchReturns]);

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        saleId: values.saleId,
        customerId: selectedSale?.customerId,
        type: values.type,
        reason: values.reason,
        notes: values.notes,
        items: Object.entries(values.items).map(([productId, info]: any) => ({
          productId,
          quantity: info.quantity,
          unitPrice: info.unitPrice,
        })).filter((i: any) => i.quantity > 0)
      };

      if (payload.items.length === 0) {
        message.warning('Please select at least one item to return');
        return;
      }

      const res = await fetch('/api/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { message.success('Return processed'); setModalOpen(false); form.resetFields(); setSelectedSale(null); fetchReturns(); }
      else message.error(data.error);
    } catch { message.error('Error processing return'); }
  };

  const columns = [
    { title: 'Return ID', dataIndex: 'returnNumber', key: 'returnNumber', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: 'Invoice', dataIndex: ['sale', 'invoiceNumber'], key: 'invoice' },
    { title: 'Customer', dataIndex: ['customer', 'name'], key: 'customer', render: (v: string) => v || '-' },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={v === 'REFUND' ? 'red' : 'blue'}>{v}</Tag> },
    { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: string) => formatCurrency(v) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Returns & Exchanges</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setSelectedSale(null); setModalOpen(true); }} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}>Process Return</Button>
      </div>
      
      <Card bordered={false} style={{ borderRadius: 16 }}>
        <Input placeholder="Search return or invoice number..." prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 16, maxWidth: 400 }} allowClear />
        <Table columns={columns} dataSource={returns} rowKey="id" loading={loading} pagination={{ current: pagination.current, total: pagination.total, pageSize: 20, onChange: (p) => fetchReturns(p, search) }} size="middle" />
      </Card>

      <Modal title="Process Return or Exchange" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={700}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="saleId" label="Select Sale / Invoice" rules={[{ required: true }]}>
            <Select 
              showSearch
              placeholder="Search by Invoice number"
              filterOption={false}
              onSearch={fetchSales}
              onChange={(val) => {
                const sale = sales.find(s => s.id === val);
                setSelectedSale(sale);
                sale?.items.forEach((item: any) => {
                  form.setFieldValue(['items', item.productId, 'unitPrice'], parseFloat(item.unitPrice));
                  form.setFieldValue(['items', item.productId, 'quantity'], 0);
                });
              }}
              options={sales.map(s => ({ label: `${s.invoiceNumber} - ${s.customer?.name || 'Walk-in'}`, value: s.id }))}
            />
          </Form.Item>
          
          <Form.Item name="type" label="Return Type" rules={[{ required: true }]} initialValue="REFUND">
            <Select options={[{label: 'Refund', value: 'REFUND'}, {label: 'Exchange', value: 'EXCHANGE'}]} />
          </Form.Item>

          {selectedSale && (
            <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
              <Title level={5}>Select Items to Return</Title>
              {selectedSale.items.map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text>{item.productName} (Sold: {parseFloat(item.quantity)}) - {formatCurrency(item.unitPrice)}/unit</Text>
                  <Form.Item name={['items', item.productId, 'quantity']} style={{ margin: 0 }}>
                    <InputNumber min={0} max={parseFloat(item.quantity)} />
                  </Form.Item>
                  <Form.Item name={['items', item.productId, 'unitPrice']} hidden><Input /></Form.Item>
                </div>
              ))}
            </div>
          )}

          <Form.Item name="reason" label="Reason"><Input /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
