'use client';
import { useState, useEffect } from 'react';
import { Typography, Card, Form, Input, InputNumber, Switch, Button, message, Divider, Space } from 'antd';
import { SaveOutlined, StoreOutlined, FileTextOutlined, AccountBookOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.data) {
          form.setFieldsValue({
            ...data.data,
            defaultVatRate: parseFloat(data.data.defaultVatRate || '0'),
          });
        }
      } catch (err) {
        message.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [form]);

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Settings saved successfully');
      } else {
        message.error(data.error || 'Failed to save settings');
      }
    } catch {
      message.error('Network error while saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>System Settings</Title>
          <Text type="secondary">Manage your shop profile, preferences, and receipt configurations</Text>
        </div>
      </div>

      <Form 
        form={form} 
        layout="vertical" 
        onFinish={handleSave} 
        initialValues={{ currency: 'Rs' }}
      >
        <Card title={<><StoreOutlined /> Shop Information</>} bordered={false} style={{ marginBottom: 24, borderRadius: 12 }}>
          <Form.Item name="shopName" label="Shop Name" rules={[{ required: true, message: 'Shop name is required' }]}>
            <Input size="large" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input size="large" />
          </Form.Item>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="phone" label="Phone Number" style={{ flex: 1, minWidth: 300 }}>
              <Input size="large" type="tel" />
            </Form.Item>
            <Form.Item name="panNumber" label="PAN / VAT Number" style={{ flex: 1, minWidth: 300 }}>
              <Input size="large" />
            </Form.Item>
          </Space>
        </Card>

        <Card title={<><AccountBookOutlined /> Financial & Region</>} bordered={false} style={{ marginBottom: 24, borderRadius: 12 }}>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="currency" label="Currency Symbol" rules={[{ required: true }]} style={{ width: 150 }}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="vatEnabled" label="Enable VAT/Tax" valuePropName="checked" style={{ width: 150 }}>
              <Switch />
            </Form.Item>
            <Form.Item 
              noStyle
              shouldUpdate={(prev, curr) => prev.vatEnabled !== curr.vatEnabled}
            >
              {({ getFieldValue }) => getFieldValue('vatEnabled') ? (
                <Form.Item name="defaultVatRate" label="Default VAT Rate (%)" style={{ width: 150 }}>
                  <InputNumber size="large" min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
              ) : null}
            </Form.Item>
          </Space>
        </Card>

        <Card title={<><FileTextOutlined /> Receipt Configuration</>} bordered={false} style={{ marginBottom: 24, borderRadius: 12 }}>
          <Form.Item name="receiptHeader" label="Receipt Header Text">
            <Input.TextArea rows={2} placeholder="E.g. Welcome to our store! We sell best quality goods." />
          </Form.Item>
          <Form.Item name="receiptFooter" label="Receipt Footer Text">
            <Input.TextArea rows={2} placeholder="E.g. Thank you for shopping with us! No returns after 7 days." />
          </Form.Item>
        </Card>

        <div style={{ textAlign: 'right' }}>
          <Button 
            type="primary" 
            size="large" 
            htmlType="submit" 
            icon={<SaveOutlined />} 
            loading={saving}
            style={{ 
              height: 48, 
              padding: '0 32px', 
              borderRadius: 8,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none',
              fontWeight: 'bold'
            }}
          >
            Save Settings
          </Button>
        </div>
      </Form>
    </div>
  );
}
