'use client';
import { useState, useEffect, useCallback } from 'react';
import { Typography, Card, Row, Col, Button, Table, message, Statistic, Tag, Space } from 'antd';
import { ReloadOutlined, RocketOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Heatmap } from '@ant-design/plots';

const { Title, Text } = Typography;

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const handleRunAnalytics = async () => {
    setRunning(true);
    message.loading({ content: 'Running AI Analytics Engine...', key: 'ai' });
    try {
      const res = await fetch('/api/analytics', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        message.success({ content: 'Analytics models updated successfully.', key: 'ai' });
        fetchAnalytics();
      } else {
        message.error({ content: result.error || 'Failed to run analytics', key: 'ai' });
      }
    } catch {
      message.error({ content: 'Error running analytics', key: 'ai' });
    }
    finally {
      setRunning(false);
    }
  };

  const heatmapConfig = {
    data: data?.heatmap || [],
    xField: 'hourOfDay',
    yField: 'dayOfWeek',
    colorField: 'totalSales',
    scale: { color: { range: ['#f4f7fe', '#667eea', '#764ba2'] } },
    shape: 'square',
    legend: false as const,
    tooltip: {
      title: 'Sales Volume',
    },
    xAxis: { title: { text: 'Hour of Day (0-23)' } },
    yAxis: { 
      title: { text: 'Day of Week' },
      label: {
        formatter: (v: string) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(v)] || v
      }
    }
  };

  const deadStockColumns = [
    { title: 'Product', dataIndex: ['product', 'name'], key: 'name' },
    { title: 'Last Sale', dataIndex: 'lastSaleDate', key: 'date', render: (v: string) => v ? new Date(v).toLocaleDateString() : 'Never' },
    { title: 'Stock', dataIndex: ['product', 'currentStock'], key: 'stock' },
    { title: 'Status', key: 'status', render: () => <Tag color="red">Dead Stock</Tag> },
  ];

  const forecastColumns = [
    { title: 'Product', dataIndex: ['product', 'name'], key: 'name' },
    { title: 'Forecast Qty', dataIndex: 'forecastQty', key: 'qty', render: (v: number) => <Text strong>{Number(v).toFixed(2)}</Text> },
    { title: 'Trend', dataIndex: 'trend', key: 'trend', render: (v: string) => (
      <Tag color={v === 'INCREASING' ? 'green' : v === 'DECREASING' ? 'red' : 'blue'}>
        {v === 'INCREASING' && <ArrowUpOutlined />} {v === 'DECREASING' && <ArrowDownOutlined />} {v}
      </Tag>
    )},
    { title: 'Reorder Level', dataIndex: 'reorderLevel', key: 'reorder', render: (v: number) => Number(v).toFixed(2) },
    { title: 'Buy Qty', dataIndex: 'recommendedPurchaseQty', key: 'buy', render: (v: number) => <Text style={{color: '#52c41a'}} strong>{v ? Number(v).toFixed(2) : '-'}</Text> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>AI Analytics Dashboard</Title>
          <Text type="secondary">Intelligent insights for inventory optimization</Text>
        </div>
        <Button 
          type="primary" 
          size="large"
          icon={running ? <ReloadOutlined spin /> : <RocketOutlined />} 
          onClick={handleRunAnalytics} 
          loading={running}
          style={{ background: 'linear-gradient(135deg, #1890ff, #fa8c16)', border: 'none' }}
        >
          Run AI Diagnostics
        </Button>
      </div>

      {!loading && data && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Card variant="borderless" style={{ borderRadius: 12 }}>
                <Statistic 
                  title="Total Dead Stock Value" 
                  value={data.summary?.deadStockValue || 0} 
                  prefix="Rs" 
                  precision={2} 
                  styles={{ content: { color: '#cf1322' } }} 
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card variant="borderless" style={{ borderRadius: 12 }}>
                <Statistic 
                  title="Products to Reorder" 
                  value={data.summary?.forecasts?.filter((f: any) => f.recommendedPurchaseQty > 0).length || 0} 
                  suffix="items" 
                  styles={{ content: { color: '#1890ff' } }} 
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card variant="borderless" style={{ borderRadius: 12 }}>
                <Statistic 
                  title="Average Margin" 
                  value={data.summary?.avgMargin || 0} 
                  suffix="%" 
                  precision={1} 
                  styles={{ content: { color: '#52c41a' } }} 
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Sales Heatmap (Hour vs Day)" variant="borderless" style={{ borderRadius: 12, height: '100%' }}>
                {data.heatmap?.length > 0 ? (
                  <Heatmap {...heatmapConfig} height={300} />
                ) : (
                  <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No sales data available</div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Dead Stock Alert" variant="borderless" style={{ borderRadius: 12, height: '100%' }}>
                <Table 
                  dataSource={data.summary?.forecasts?.filter((f: any) => f.isDeadStock) || []} 
                  columns={deadStockColumns} 
                  pagination={{ pageSize: 4 }} 
                  rowKey="id"
                  size="small"
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="Purchase Recommendations & Forecasts" variant="borderless" style={{ borderRadius: 12 }}>
                <Table 
                  dataSource={data.summary?.forecasts || []} 
                  columns={forecastColumns} 
                  pagination={{ pageSize: 10 }} 
                  rowKey="id"
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
