import { Card, Form, Select, Switch, Typography, Space, Divider } from 'antd';

const { Title, Text } = Typography;

function Settings() {
  const [form] = Form.useForm();

  return (
    <div>
      <Title level={2}>设置</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="外观设置">
          <Form form={form} layout="vertical">
            <Form.Item label="主题" name="theme" initialValue="light">
              <Select
                style={{ width: 200 }}
                options={[
                  { label: '浅色', value: 'light' },
                  { label: '深色', value: 'dark' },
                  { label: '跟随系统', value: 'auto' },
                ]}
              />
            </Form.Item>
            <Form.Item label="语言" name="language" initialValue="zh-CN">
              <Select
                style={{ width: 200 }}
                options={[
                  { label: '简体中文', value: 'zh-CN' },
                  { label: 'English', value: 'en-US' },
                ]}
              />
            </Form.Item>
          </Form>
        </Card>

        <Card title="应用设置">
          <Form layout="vertical">
            <Form.Item label="启动时打开">
              <Switch />
              <Text type="secondary" style={{ marginLeft: 8 }}>
                系统启动时自动打开应用
              </Text>
            </Form.Item>
            <Form.Item label="最小化到托盘">
              <Switch defaultChecked />
              <Text type="secondary" style={{ marginLeft: 8 }}>
                关闭窗口时最小化到系统托盘
              </Text>
            </Form.Item>
          </Form>
        </Card>

        <Card title="关于">
          <Space direction="vertical">
            <Text strong>Desktop Toolkit v1.0.0</Text>
            <Divider style={{ margin: '8px 0' }} />
            <Text type="secondary">一个功能强大的本地桌面工具集应用</Text>
            <Text type="secondary">基于 Electron + React + TypeScript 构建</Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
}

export default Settings;
