'use client';
import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, Space, Typography, message, Tag, Row, Col, Card } from 'antd';
import { PlusOutlined, SearchOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { formatCurrency } from '@/lib/utils/currency';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([]);
  const [products, setProducts] = useState<{id: string, name: string, purchasePrice: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [receiveModal, setReceiveModal] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  
  const [form] = Form.useForm();
  const [receiveForm] = Form.useForm();

  const fetchData = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchases?page=${page}&limit=20&search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) { 
        setPurchases(data.data); 
        setPagination(p => ({ ...p, current: data.meta.page, total: data.meta.total })); 
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const loadDependencies = useCallback(async () => {
    try {
      const [suppRes, prodRes] = await Promise.all([
        fetch('/api/suppliers?limit=100').then(r => r.json()),
        fetch('/api/products?limit=500').then(r => r.json())
      ]);
      if (suppRes.success) setSuppliers(suppRes.data);
      if (prodRes.success) setProducts(prodRes.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchData(); loadDependencies(); }, [fetchData, loadDependencies]);
  useEffect(() => { const t = setTimeout(() => fetchData(1, search), 400); return () => clearTimeout(t); }, [search, fetchData]);

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        ...values,
        expectedDate: values.expectedDate?.toISOString(),
      };
      const res = await fetch('/api/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { message.success('Purchase Order Created'); setModalOpen(false); form.resetFields(); fetchData(); }
      else message.error(data.error);
    } catch { message.error('Error'); }
  };

  const handleReceive = async (values: any) => {
    try {
      const items = Object.entries(values).map(([purchaseItemId, receivedQty]) => ({ purchaseItemId, receivedQty }));
      const res = await fetch(`/api/purchases/${receiveModal.id}/receive`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      const data = await res.json();
      if (data.success) { message.success('Items received'); setReceiveModal(null); receiveForm.resetFields(); fetchData(); }
      else message.error(data.error);
    } catch { message.error('Error processing receipt'); }
  };

  const columns = [
    { title: 'PO Number', dataIndex: 'orderNumber', key: 'orderNumber', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', render: (s: any) => s?.name || 'N/A' },
    { title: 'Amount', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: string) => formatCurrency(v) },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'RECEIVED' ? 'green' : s === 'CONFIRMED' ? 'blue' : 'default'}>{s}</Tag> },
    { title: 'Actions', key: 'actions', render: (_: any, r: any) => (
      <Space>
        {r.status !== 'RECEIVED' && <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={async () => {
          const res = await fetch(`/api/purchases/${r.id}`);
          const data = await res.json();
          if (data.success) { setReceiveModal(data.data); }
        }}>Receive</Button>}
      </Space>
    )}
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Purchase Orders</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}>Create PO</Button>
      </div>
      
      <Card variant="borderless" style={{ borderRadius: 16 }}>
        <Input placeholder="Search PO number..." prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 16, maxWidth: 400 }} allowClear />
        <Table columns={columns} dataSource={purchases} rowKey="id" loading={loading} pagination={{ current: pagination.current, total: pagination.total, pageSize: 20, onChange: (p) => fetchData(p, search) }} size="middle" />
      </Card>

      <Modal title="Create Purchase Order" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={700}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="supplierId" label="Supplier" rules={[{ required: true }]}><Select options={suppliers.map(s => ({ label: s.name, value: s.id }))} showSearch optionFilterProp="label" /></Form.Item></Col>
            <Col span={12}><Form.Item name="expectedDate" label="Expected Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item {...restField} name={[name, 'productId']} rules={[{ required: true }]}>
                      <Select placeholder="Select Product" style={{ width: 300 }} showSearch optionFilterProp="label" options={products.map(p => ({ label: p.name, value: p.id }))} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'quantity']} rules={[{ required: true }]}><InputNumber placeholder="Qty" min={0.1} /></Form.Item>
                    <Form.Item {...restField} name={[name, 'unitPrice']} rules={[{ required: true }]}><InputNumber placeholder="Unit Price" min={0} /></Form.Item>
                    <DeleteOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer' }} />
                  </Space>
                ))}
                <Form.Item><Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Item</Button></Form.Item>
              </>
            )}
          </Form.List>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {receiveModal && (
        <Modal title={`Receive PO: ${receiveModal.orderNumber}`} open={!!receiveModal} onCancel={() => setReceiveModal(null)} onOk={() => receiveForm.submit()} width={600}>
          <Form form={receiveForm} layout="vertical" onFinish={handleReceive}>
            <Table 
              dataSource={receiveModal.items} 
              rowKey="id" 
              pagination={false}
              columns={[
                { title: 'Product', dataIndex: ['product', 'name'], key: 'product' },
                { title: 'Ordered', dataIndex: 'quantity', key: 'qty', render: (v) => parseFloat(v).toString() },
                { title: 'Prev Received', dataIndex: 'receivedQty', key: 'prev', render: (v) => parseFloat(v).toString() },
                { title: 'Receive Now', key: 'receive', render: (_, r: any) => {
                  const remaining = Math.max(0, parseFloat(r.quantity) - parseFloat(r.receivedQty));
                  return (
                    <Form.Item name={r.id} initialValue={remaining} style={{ margin: 0 }}>
                      <InputNumber min={0} max={remaining} disabled={remaining === 0} />
                    </Form.Item>
                  );
                }}
              ]}
            />
          </Form>
        </Modal>
      )}
    </div>
  );
}
