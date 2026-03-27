'use client';
import { useState, useEffect } from 'react';
import { Typography, Card, Tabs, Table, Button, DatePicker, Row, Col, Statistic, Space, Tag } from 'antd';
import { DownloadOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import { formatCurrency } from '@/lib/utils/currency';
import { Line, Column } from '@ant-design/plots';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState<any>([dayjs().subtract(30, 'day'), dayjs()]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = `/api/reports?type=${activeTab}`;
      if (dateRange && dateRange.length === 2 && activeTab === 'sales') {
        url += `&startDate=${dateRange[0].toISOString()}&endDate=${dateRange[1].toISOString()}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReportData(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, dateRange]);

  // Sales Report Configuration
  const salesColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Sales Count', dataIndex: 'saleCount', key: 'saleCount' },
    { title: 'Revenue', dataIndex: 'total', key: 'total', render: (v: string) => formatCurrency(v) },
    { title: 'Profit', dataIndex: 'profit', key: 'profit', render: (v: string) => <span style={{color: '#52c41a'}}>{formatCurrency(v)}</span> },
  ];
  const salesExportCols = [
    { title: 'Date', dataKey: 'date' },
    { title: 'Sales Count', dataKey: 'saleCount' },
    { title: 'Revenue', dataKey: 'total' },
    { title: 'Profit', dataKey: 'profit' },
  ];

  // Stock Report Configuration
  const stockColumns = [
    { title: 'Product', dataIndex: 'name', key: 'name' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Stock Qty', dataIndex: 'stock', key: 'stock' },
    { title: 'Purchase Price', dataIndex: 'purchasePrice', key: 'purchasePrice', render: (v: string) => formatCurrency(v) },
    { title: 'Total Value', dataIndex: 'totalValue', key: 'totalValue', render: (v: string) => formatCurrency(v) },
  ];
  const stockExportCols = [
    { title: 'Product Name', dataKey: 'name' },
    { title: 'Category', dataKey: 'category' },
    { title: 'Stock', dataKey: 'stock' },
    { title: 'Purchase Price', dataKey: 'purchasePrice' },
    { title: 'Total Asset Value', dataKey: 'totalValue' },
  ];

  // Credit Report Configuration
  const creditColumns = [
    { title: 'Customer Name', dataIndex: 'name', key: 'name' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Credit Limit', dataIndex: 'creditLimit', key: 'limit', render: (v: string) => formatCurrency(v) },
    { title: 'Outstanding Balance', dataIndex: 'creditBalance', key: 'balance', render: (v: string) => <Tag color="red">{formatCurrency(v)}</Tag> },
  ];
  const creditExportCols = [
    { title: 'Customer Name', dataKey: 'name' },
    { title: 'Phone Number', dataKey: 'phone' },
    { title: 'Credit Limit', dataKey: 'creditLimit' },
    { title: 'Outstanding Balance', dataKey: 'creditBalance' },
  ];

  const handleExportPDF = async () => {
    const { exportToPDF } = await import('@/lib/utils/export');
    if (activeTab === 'sales') exportToPDF('Sales & Profit Report', salesExportCols, reportData?.timeline || []);
    if (activeTab === 'stock') exportToPDF('Inventory Valuation Report', stockExportCols, reportData?.products || []);
    if (activeTab === 'credit') exportToPDF('Customer Credit Report', creditExportCols, reportData?.customers || []);
  };

  const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/lib/utils/export');
    if (activeTab === 'sales') exportToExcel('Sales & Profit Report', salesExportCols, reportData?.timeline || []);
    if (activeTab === 'stock') exportToExcel('Inventory Valuation Report', stockExportCols, reportData?.products || []);
    if (activeTab === 'credit') exportToExcel('Customer Credit Report', creditExportCols, reportData?.customers || []);
  };

  const salesLineConfig = {
    data: reportData?.timeline || [],
    xField: 'date',
    yField: 'total',
    color: '#667eea',
    point: { size: 4, shape: 'diamond' },
    tooltip: { showMarkers: false },
    state: { active: { style: { shadowBlur: 4, stroke: '#000', fill: 'red' } } },
    interactions: [{ type: 'marker-active' }],
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Business Reports</Title>
        <Space>
          {activeTab === 'sales' && (
            <RangePicker 
              value={dateRange} 
              onChange={(dates) => setDateRange(dates)} 
              allowClear={false}
            />
          )}
          <Button icon={<FilePdfOutlined />} onClick={handleExportPDF} danger>Export PDF</Button>
          <Button icon={<FileExcelOutlined />} onClick={handleExportExcel} style={{ color: '#52c41a', borderColor: '#52c41a' }}>Export Excel</Button>
        </Space>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" size="large">
        <Tabs.TabPane tab="Sales & Profit" key="sales">
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Card bordered={false}><Statistic title="Total Revenue" value={reportData?.summary?.totalRevenue || 0} precision={2} prefix="Rs" valueStyle={{ color: '#1890ff' }} /></Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card bordered={false}><Statistic title="Total Profit" value={reportData?.summary?.totalProfit || 0} precision={2} prefix="Rs" valueStyle={{ color: '#52c41a' }} /></Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card bordered={false}><Statistic title="Transactions" value={reportData?.summary?.totalSales || 0} /></Card>
            </Col>
          </Row>
          <Card bordered={false} style={{ marginBottom: 16 }}>
            <Title level={5}>Revenue Timeline</Title>
            <div style={{ height: 300 }}>
              {reportData?.timeline && reportData.timeline.length > 0 ? <Line {...salesLineConfig} /> : <div style={{textAlign: 'center', paddingTop: 100}}>No sales in period</div>}
            </div>
          </Card>
          <Table columns={salesColumns} dataSource={reportData?.timeline || []} rowKey="date" loading={loading} />
        </Tabs.TabPane>

        <Tabs.TabPane tab="Inventory Valuation" key="stock">
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12}>
              <Card bordered={false}><Statistic title="Total Asset Value (Purchase)" value={reportData?.summary?.stockValuation || 0} precision={2} prefix="Rs" /></Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card bordered={false}><Statistic title="Total Retail Value (Selling)" value={reportData?.summary?.retailValuation || 0} precision={2} prefix="Rs" valueStyle={{ color: '#722ed1' }} /></Card>
            </Col>
          </Row>
          <Card bordered={false}>
            <Table columns={stockColumns} dataSource={reportData?.products || []} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
          </Card>
        </Tabs.TabPane>

        <Tabs.TabPane tab="Customer Credit" key="credit">
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12}>
              <Card bordered={false}><Statistic title="Total Outstanding Credit" value={reportData?.summary?.totalCreditOutstanding || 0} precision={2} prefix="Rs" valueStyle={{ color: '#cf1322' }} /></Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card bordered={false}><Statistic title="Customers in Debt" value={reportData?.summary?.customerCount || 0} /></Card>
            </Col>
          </Row>
          <Card bordered={false}>
            <Table columns={creditColumns} dataSource={reportData?.customers || []} rowKey="id" loading={loading} />
          </Card>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}
