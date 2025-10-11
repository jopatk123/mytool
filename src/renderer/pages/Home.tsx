import { useCallback, useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Space } from 'antd';
import { PictureOutlined, FolderOutlined, ToolOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ToolConfig } from '@shared/types';
import { createLogger } from '@shared/utils/logger';
import { useElectronAPI } from '@renderer/hooks/useElectronAPI';

const logger = createLogger('HomePage');

const { Title, Paragraph } = Typography;

function Home() {
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const electronAPI = useElectronAPI();
  const navigate = useNavigate();

  const loadTools = useCallback(async () => {
    try {
      const toolList = await electronAPI.getToolList();
      setTools(toolList);
      logger.success('Loaded tool list', { count: toolList.length });
    } catch (error) {
      logger.error('Failed to load tools', error);
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
      <div>
        <Title level={3}>工具列表</Title>
        <Row gutter={[16, 16]}>
          {tools.map(tool => (
            <Col key={tool.id} span={8}>
              <Card
                hoverable
                style={{ height: '100%', cursor: 'pointer' }}
                onClick={() => {
                  // For image and file categories navigate to dedicated pages
                  if (tool.category === 'image') {
                    navigate('/tools/image');
                    return;
                  }

                  if (tool.category === 'file') {
                    navigate('/tools/file');
                    return;
                  }

                  // Fallback: call executeTool if other types are provided by main
                  try {
                    void electronAPI.executeTool(tool.id, {});
                  } catch (err) {
                    // ignore — executeTool may not be available in non-Electron env
                    logger.warn('executeTool not available or failed', err);
                  }
                }}
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
    </div>
  );
}

export default Home;
