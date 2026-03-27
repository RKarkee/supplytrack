'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Button, Dropdown, Avatar, Badge } from 'antd';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  TeamOutlined,
  TruckOutlined,
  DollarOutlined,
  BarChartOutlined,
  SettingOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShopOutlined,
  FileTextOutlined,
  RocketOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { useUIStore } from '@/stores';
import Link from 'next/link';

const menuItems = [
  { section: 'Main' },
  { key: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  { key: '/pos', label: 'Point of Sale', icon: <ShoppingCartOutlined /> },
  { section: 'Inventory' },
  { key: '/products', label: 'Products', icon: <AppstoreOutlined /> },
  { key: '/purchases', label: 'Purchases', icon: <FileTextOutlined /> },
  { key: '/returns', label: 'Returns', icon: <UndoOutlined /> },
  { section: 'People' },
  { key: '/customers', label: 'Customers', icon: <TeamOutlined /> },
  { key: '/suppliers', label: 'Suppliers', icon: <TruckOutlined /> },
  { section: 'Finance' },
  { key: '/expenses', label: 'Expenses', icon: <DollarOutlined /> },
  { key: '/reports', label: 'Reports', icon: <BarChartOutlined /> },
  { section: 'Intelligence' },
  { key: '/analytics', label: 'AI Analytics', icon: <RocketOutlined /> },
  { section: 'System' },
  { key: '/settings', label: 'Settings', icon: <SettingOutlined /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [alerts, setAlerts] = useState<any[]>([]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      if (data.success) setAlerts(data.data);
    } catch {}
  };

  useEffect(() => {
    fetchAlerts();
    const int = setInterval(fetchAlerts, 60000); // Check every minute
    return () => clearInterval(int);
  }, [pathname]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-icon">
            <ShopOutlined style={{ color: 'white' }} />
          </div>
          {!sidebarCollapsed && <span className="logo-text">SupplyTrack</span>}
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item, index) => {
            if ('section' in item && item.section) {
              if (sidebarCollapsed) return null;
              return (
                <div key={`section-${index}`} className="sidebar-section">
                  {item.section}
                </div>
              );
            }
            const menuItem = item as { key: string; label: string; icon: React.ReactNode };
            return (
              <Link
                key={menuItem.key}
                href={menuItem.key}
                className={`sidebar-menu-item ${pathname === menuItem.key ? 'active' : ''}`}
              >
                <span className="icon">{menuItem.icon}</span>
                {!sidebarCollapsed && <span className="label">{menuItem.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="top-header">
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSidebar}
            style={{ fontSize: 18 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Dropdown
              menu={{
                items: alerts.length > 0 
                  ? alerts.map(a => ({ key: a.id, label: `${a.title}: ${a.message.substring(0, 30)}...` }))
                  : [{ key: 'empty', label: 'No new alerts', disabled: true }]
              }}
              placement="bottomRight"
            >
              <Badge count={alerts.length} size="small" style={{ cursor: 'pointer' }}>
                <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
              </Badge>
            </Dropdown>

            <Dropdown
              menu={{
                items: [
                  {
                    key: 'user',
                    label: session?.user?.name || 'Shop Owner',
                    icon: <UserOutlined />,
                    disabled: true,
                  },
                  { type: 'divider' },
                  {
                    key: 'settings',
                    label: 'Settings',
                    icon: <SettingOutlined />,
                    onClick: () => router.push('/settings'),
                  },
                  {
                    key: 'logout',
                    label: 'Sign Out',
                    icon: <LogoutOutlined />,
                    danger: true,
                    onClick: handleLogout,
                  },
                ],
              }}
              placement="bottomRight"
            >
              <Avatar
                style={{ backgroundColor: '#667eea', cursor: 'pointer' }}
                icon={<UserOutlined />}
              />
            </Dropdown>
          </div>
        </header>

        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
