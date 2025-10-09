import { useCallback, useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Divider } from 'antd';
import { PictureOutlined, FolderOutlined, ToolOutlined } from '@ant-design/icons';
import { ToolConfig } from '@shared/types';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';

const { Title, Paragraph } = Typography;

function Home() {
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const electronAPI = useElectronAPI();

  const loadTools = useCallback(async () => {
    try {
  const toolList = await electronAPI.getToolList();
      setTools(toolList);
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  }, [electronAPI]);

  useEffect(() => {
    void loadTools();
  }, [loadTools]);

  const getIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <PictureOutlined />;
      case 'file':
        return <FolderOutlined />;
      default:
        return <ToolOutlined />;
    }
  };

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>欢迎使用 Desktop Toolkit</Title>
          <Paragraph type="secondary">
            一个功能强大的本地桌面工具集，帮助您提高工作效率
          </Paragraph>
        </div>

        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="可用工具"
                value={tools.length}
                prefix={<ToolOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="图片工具"
                value={tools.filter(t => t.category === 'image').length}
                prefix={<PictureOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="文件工具"
                value={tools.filter(t => t.category === 'file').length}
                prefix={<FolderOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        <Divider />

        <div>
          <Title level={3}>工具列表</Title>
          <Row gutter={[16, 16]}>
            {tools.map(tool => (
              <Col key={tool.id} span={8}>
                <Card
                  hoverable
                  style={{ height: '100%' }}
                >
                  <Space direction="vertical" size="small">
                    <div style={{ fontSize: '32px' }}>
                      {tool.icon || getIcon(tool.category)}
                    </div>
                    <Title level={4} style={{ margin: 0 }}>
                      {tool.name}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: 0 }}>
                      {tool.description}
                    </Paragraph>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Space>
    </div>
  );
}

export default Home;
