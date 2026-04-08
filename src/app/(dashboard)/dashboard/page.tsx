'use client';

import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Spin, Typography } from 'antd';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  WarningOutlined,
  TeamOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/date';

const { Title, Text } = Typography;

interface DashboardData {
  todaySales: { count: number; total: number };
  monthSales: { count: number; total: number };
  totalProducts: number;
  lowStockCount: number;
  totalCustomers: number;
  pendingCredit: number;
  todayExpenses: number;
  recentSales: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    paymentStatus: string;
    createdAt: string;
    customer: { name: string } | null;
  }>;
  topProducts: Array<{
    productName: string;
    totalQty: number;
    totalRevenue: number;
  }>;
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) return <div>Failed to load dashboard data</div>;

  const statCards = [
    {
      title: "Today's Sales",
      value: data.todaySales.total,
      prefix: 'Rs',
      count: `${data.todaySales.count} transactions`,
      icon: <DollarOutlined />,
      color: '#667eea',
      bg: 'linear-gradient(135deg, #667eea33, #764ba233)',
    },
    {
      title: "Month's Sales",
      value: data.monthSales.total,
      prefix: 'Rs',
      count: `${data.monthSales.count} transactions`,
      icon: <ShoppingCartOutlined />,
      color: '#52c41a',
      bg: 'linear-gradient(135deg, #52c41a33, #73d13d33)',
    },
    {
      title: 'Total Products',
      value: data.totalProducts,
      count: `${data.lowStockCount} low stock`,
      icon: <AppstoreOutlined />,
      color: '#faad14',
      bg: 'linear-gradient(135deg, #faad1433, #ffc53d33)',
    },
    {
      title: 'Low Stock Items',
      value: data.lowStockCount,
      count: 'Need attention',
      icon: <WarningOutlined />,
      color: '#ff4d4f',
      bg: 'linear-gradient(135deg, #ff4d4f33, #ff7a4533)',
    },
    {
      title: 'Customers',
      value: data.totalCustomers,
      count: 'Active',
      icon: <TeamOutlined />,
      color: '#13c2c2',
      bg: 'linear-gradient(135deg, #13c2c233, #36cfc933)',
    },
    {
      title: 'Pending Credit',
      value: data.pendingCredit,
      prefix: 'Rs',
      count: 'Outstanding',
      icon: <CreditCardOutlined />,
      color: '#eb2f96',
      bg: 'linear-gradient(135deg, #eb2f9633, #f759ab33)',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
        <Text type="secondary">Welcome back! Here&apos;s your shop overview.</Text>
      </div>

      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card, idx) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={idx}>
            <div className="stat-card">
              <div
                className="stat-icon"
                style={{ background: card.bg, color: card.color }}
              >
                {card.icon}
              </div>
              <div className="stat-value">
                {card.prefix ? formatCurrency(card.value) : card.value}
              </div>
              <div className="stat-label">{card.title}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{card.count}</Text>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* Recent Sales */}
        <Col xs={24} lg={14}>
          <Card title="Recent Sales" variant="borderless" style={{ borderRadius: 16 }}>
            <Table
              dataSource={data.recentSales}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Invoice',
                  dataIndex: 'invoiceNumber',
                  key: 'invoiceNumber',
                  render: (v: string) => <Text strong style={{ color: '#667eea' }}>{v}</Text>,
                },
                {
                  title: 'Customer',
                  key: 'customer',
                  render: (_: unknown, r: DashboardData['recentSales'][0]) => r.customer?.name || 'Walk-in',
                },
                {
                  title: 'Amount',
                  dataIndex: 'totalAmount',
                  key: 'totalAmount',
                  render: (v: string) => formatCurrency(v),
                },
                {
                  title: 'Status',
                  dataIndex: 'paymentStatus',
                  key: 'paymentStatus',
                  render: (v: string) => (
                    <Tag color={v === 'PAID' ? 'green' : v === 'PARTIAL' ? 'orange' : 'red'}>
                      {v}
                    </Tag>
                  ),
                },
                {
                  title: 'Time',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  render: (v: string) => formatDateTime(v),
                },
              ]}
            />
          </Card>
        </Col>

        {/* Top Products and Alerts */}
        <Col xs={24} lg={10}>
          <Card
            title="Top Products (This Month)"
            variant="borderless"
            style={{ borderRadius: 16, marginBottom: 16 }}
          >
            {data.topProducts.length === 0 ? (
              <Text type="secondary">No sales data yet this month</Text>
            ) : (
              data.topProducts.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: idx < data.topProducts.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}
                >
                  <div>
                    <Text strong>{p.productName}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {p.totalQty} units sold
                    </Text>
                  </div>
                  <Text strong style={{ color: '#52c41a' }}>
                    {formatCurrency(p.totalRevenue)}
                  </Text>
                </div>
              ))
            )}
          </Card>

          {data.alerts.length > 0 && (
            <Card
              title={
                <span>
                  <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  Active Alerts
                </span>
              }
              variant="borderless"
              style={{ borderRadius: 16 }}
            >
              {data.alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <Tag
                    color={
                      alert.severity === 'CRITICAL' ? 'red' :
                      alert.severity === 'HIGH' ? 'orange' :
                      alert.severity === 'MEDIUM' ? 'gold' : 'blue'
                    }
                  >
                    {alert.type.replace('_', ' ')}
                  </Tag>
                  <Text style={{ fontSize: 13 }}>{alert.title}</Text>
                </div>
              ))}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
