import { ReactNode, useState } from 'react';
import { Layout as AntLayout, Menu, theme, Button } from 'antd';
import {
  HomeOutlined,
  PictureOutlined,
  FolderOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';
import { appInfo } from '@renderer/env';
import './Layout.css';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const electronAPI = useElectronAPI();
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const shortName = appInfo.name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase())
    .join('') || appInfo.name.slice(0, 2);

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: 'tools',
      icon: <PictureOutlined />,
      label: '工具',
      children: [
        {
          key: '/tools/image',
          icon: <PictureOutlined />,
          label: '图片处理',
        },
        {
          key: '/tools/file',
          icon: <FolderOutlined />,
          label: '文件工具',
        },
      ],
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key !== 'tools') {
      navigate(key);
    }
  };

  return (
    <AntLayout style={{ height: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="logo">
          <span className="logo-text">{collapsed ? shortName : appInfo.name}</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <AntLayout>
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <div className="header-content">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />
            <div className="window-controls">
              <Button type="text" onClick={() => electronAPI.windowMinimize()}>
                −
              </Button>
              <Button type="text" onClick={() => electronAPI.windowMaximize()}>
                □
              </Button>
              <Button type="text" danger onClick={() => electronAPI.windowClose()}>
                ×
              </Button>
            </div>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: 8,
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

export default Layout;
